#include "AirplaneRadar.h"
#include "SimCom/SimCom.h"
#include "Utils/Logger.h"
#include "Utils/Time.h"
#include "LocalAircraft.h"

using namespace SimConnect;
extern SimCom simcom;
extern LocalAircraft aircraft;

struct RadarIdent_Model : DataModel
{
	struct RadarIdent
	{
		char model[32]; // aircraft model
		char callsign[32]; // flight callsign
		int isUser; // controlled by user
	};
	static const VarDef vars[3];

	void GetModel(const VarDef** pArray, unsigned int* count) const override
	{
		*pArray = vars;
		*count = sizeof(vars) / sizeof(*vars);
	}
	const char* GetName() const override
	{
		return "RadarIdent";
	}
};

const DataModel::VarDef RadarIdent_Model::vars[] =
{
	{ VarType::STRING32, "ATC MODEL", nullptr },
	{ VarType::STRING32, "ATC ID", nullptr },
	{ VarType::INT32, "IS USER SIM", "bool" },
};
static RadarIdent_Model identModel;

struct RadarInfo_Model : DataModel
{
	struct RadarInfo
	{
		double longitude;
		double latitude;
		double heading;

		int altitude;
		int groundAltitude;

		int indicatedSpeed;
		int groundSpeed;
		int verticalSpeed;
	};
	static const VarDef vars[8];

	void GetModel(const VarDef** pArray, unsigned int* count) const override
	{
		*pArray = vars;
		*count = sizeof(vars) / sizeof(*vars);
	}
	const char* GetName() const override
	{
		return "RadarInfo";
	}
};

const DataModel::VarDef RadarInfo_Model::vars[] =
{
	{ VarType::FLOAT64, "PLANE LONGITUDE", "degrees" },
	{ VarType::FLOAT64, "PLANE LATITUDE", "degrees" },
	{ VarType::FLOAT64, "PLANE HEADING DEGREES TRUE", "degrees" },

	{ VarType::INT32, "PLANE ALTITUDE", "feet" },
	{ VarType::INT32, "PLANE ALT ABOVE GROUND", "feet" },

	{ VarType::INT32, "AIRSPEED INDICATED", "knots" },
	{ VarType::INT32, "GROUND VELOCITY", "knots" },
	{ VarType::INT32, "VERTICAL SPEED", "feet/second" },
};
static RadarInfo_Model infoModel;

struct Airplane
{
	ObjectId objId{};
	double spawnTime{};
	bool isUser = false;
	bool spawned = false;

	RequestId identId{};
	char callsign[16]{};
	char model[8]{};

	RequestId radarId{};
	RadarInfo_Model::RadarInfo radarInfo{};
};

AirplaneRadar::AirplaneRadar()
{
}

AirplaneRadar::~AirplaneRadar()
{
}

void AirplaneRadar::Initialize()
{
	auto& client = simcom.GetSimConnect();
	client.RegisterDataModel(identModel);
	client.RegisterDataModel(infoModel);

	RemoveAll();
	aircraft.Initialize();

	auto callback = [this](void* data, SimConnect::ObjectId objId)
		{
			if (objId == 0)
				return;

			auto& object = Add(objId);
			object.spawnTime = NAN;
			OnIdent(data, object);
		};
	client.RequestDataOnSimObjectType(SimConnect::ObjectType::AIRCRAFT, identModel, callback, 200000);
	client.RequestDataOnSimObjectType(SimConnect::ObjectType::HELICOPTER, identModel, callback, 200000);

	client.SubscribeToObjectAdded([this](SimConnect::EventObject event)
		{
			switch (event.type)
			{
				case SimConnect::ObjectType::AIRCRAFT:
				case SimConnect::ObjectType::HELICOPTER:
				{
					Add(event.objectId);
					break;
				}
			}
		});
	client.SubscribeToObjectRemoved([this](SimConnect::EventObject event)
		{
			switch (event.type)
			{
				case SimConnect::ObjectType::AIRCRAFT:
				case SimConnect::ObjectType::HELICOPTER:
				{
					Remove(event.objectId);
					break;
				}
			}
		});
}

void AirplaneRadar::Shutdown()
{
	RemoveAll();
	aircraft.Remove();
}

Airplane& AirplaneRadar::Add(unsigned int id)
{
	for (auto& airplane : airplanes)
	{
		if (airplane.objId == id)
			return airplane;
	}

	auto& airplane = airplanes.emplace_back();
	airplane.objId = id;
	airplane.spawnTime = Time::SteadyNow() + Time::SecondToMs(5);
	airplane.isUser = false;
	return airplane;
}

void AirplaneRadar::Remove(unsigned int id)
{
	for (auto i = airplanes.begin(); i != airplanes.end(); ++i)
	{
		auto& airplane = *i;
		if (airplane.objId == id)
		{
			OnRemove(airplane);
			airplanes.erase(i);
			return;
		}
	}
}

void AirplaneRadar::RemoveAll()
{
	for (auto& airplane : airplanes)
	{
		OnRemove(airplane);
	}
	airplanes.clear();
}

void AirplaneRadar::OnRemove(Airplane& airplane)
{
	if (!std::isnan(airplane.spawnTime))
		return;
	
	if (airplane.isUser)
	{
		aircraft.Remove();
	}
	else if (airplane.spawned && OnPlaneRemove)
	{
		PlaneRemoveArgs e;
		e.id = airplane.objId;
		OnPlaneRemove(e);
	}
}

static void StrCpy_Safe(const char* src, size_t srcSize, char* dest, size_t destSize)
{
	auto size = strnlen_s(src, srcSize);
	if (size >= destSize)
		size = destSize - 1;
	memcpy(dest, src, size);
	dest[size] = 0;
}

void AirplaneRadar::Ident(Airplane& airplane)
{
	auto& client = simcom.GetSimConnect();
	
	airplane.identId = client.RequestDataOnSimObject(airplane.objId, identModel, [this](void* data, unsigned int objId)
		{
			for (auto& airplane : airplanes)
			{
				if (airplane.objId == objId)
				{
					airplane.identId = 0;
					OnIdent(data, airplane);
					return;
				}
			}
		});
}

void AirplaneRadar::OnIdent(void* data, Airplane& airplane)
{
	auto& ident = *reinterpret_cast<RadarIdent_Model::RadarIdent*>(data);

	if (ident.isUser)
	{
		airplane.isUser = true;
		aircraft.Set(airplane.objId);
		return;
	}

	StrCpy_Safe(ident.callsign, sizeof(ident.callsign), airplane.callsign, sizeof(airplane.callsign));
	StrCpy_Safe(ident.model, sizeof(ident.model), airplane.model, sizeof(airplane.model));

	Logger::Log("Radar identified: {} - {}", airplane.objId, airplane.callsign);
	Track(airplane);
}

void AirplaneRadar::Track(Airplane& airplane)
{
	auto& client = simcom.GetSimConnect();

	airplane.radarId = client.RequestDataOnSimObject(airplane.objId, infoModel, [this](void* data, SimConnect::ObjectId objId)
		{
			auto& info = *reinterpret_cast<RadarInfo_Model::RadarInfo*>(data);

			for (auto& airplane : airplanes)
			{
				if (airplane.objId == objId)
				{
					if (info.longitude < 1 && info.longitude > -1 &&
						info.latitude < 1 && info.latitude > -1 &&
						info.altitude < 1000)
						return;

					if (!airplane.spawned)
					{
						airplane.spawned = true;
						Logger::Log("Spawned aircraft {}", airplane.objId);

						if (OnPlaneAdd)
						{
							PlaneAddArgs e;
							e.id = airplane.objId;
							e.model = airplane.model;
							e.callsign = airplane.callsign;
							OnPlaneAdd(e);
						}
					}

					airplane.radarInfo = info;

					if (OnPlaneUpdate)
					{
						PlaneUpdateArgs e;
						e.id = objId;
						e.longitude = info.longitude;
						e.latitude = info.latitude;
						e.heading = info.heading;

						e.altitude = info.altitude;
						e.groundAltitude = info.groundAltitude;

						e.indicatedSpeed = info.indicatedSpeed;
						e.groundSpeed = info.groundSpeed;
						e.verticalSpeed = info.verticalSpeed;
						OnPlaneUpdate(e);
					}
					return;
				}
			}
		}, RequestPeriod::SECOND);
}

void AirplaneRadar::OnUpdate()
{
	auto now = Time::SteadyNow();

	for (auto& airplane : airplanes)
	{
		if (airplane.spawnTime <= now)
		{
			airplane.spawnTime = NAN;
			Ident(airplane);
		}
	}
}

void AirplaneRadar::Resync()
{
	for (auto& airplane : airplanes)
	{
		if (!std::isnan(airplane.spawnTime) || airplane.isUser || !airplane.spawned)
			continue;

		if (OnPlaneAdd)
		{
			PlaneAddArgs e;
			e.id = airplane.objId;
			e.model = airplane.model;
			e.callsign = airplane.callsign;
			OnPlaneAdd(e);
		}
	}
}
