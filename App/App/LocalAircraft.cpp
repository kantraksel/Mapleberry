#include "LocalAircraft.h"
#include "SimCom/SimCom.h"
#include "Utils/Logger.h"

using namespace SimConnect;
extern SimCom simcom;

struct AircraftTrack_Model : DataModel
{
	typedef LocalAircraft::AircraftTrack AircraftTrack;

	static const VarDef vars[10];

	void GetModel(const VarDef** pArray, unsigned int* count) const override
	{
		*pArray = vars;
		*count = sizeof(vars) / sizeof(*vars);
	}
	const char* GetName() const override
	{
		return "AircraftTrack";
	}
};
const DataModel::VarDef AircraftTrack_Model::vars[] =
{
	{ VarType::FLOAT64, "PLANE LONGITUDE", "degrees" },
	{ VarType::FLOAT64, "PLANE LATITUDE", "degrees" },
	{ VarType::FLOAT64, "PLANE HEADING DEGREES GYRO", "degrees" },
	{ VarType::FLOAT64, "PLANE HEADING DEGREES TRUE", "degrees" },

	{ VarType::INT32, "INDICATED ALTITUDE", "feet" },
	{ VarType::INT32, "PLANE ALTITUDE", "feet" },
	{ VarType::INT32, "PLANE ALT ABOVE GROUND", "feet" },

	{ VarType::INT32, "AIRSPEED INDICATED", "knots" },
	{ VarType::INT32, "GROUND VELOCITY", "knots" },
	{ VarType::INT32, "VERTICAL SPEED", "feet/second" },
};

struct AircraftIdent_Model : DataModel
{
	struct AircraftIdent
	{
		char airline[64]; // airline ICAO
		char number[8]; // flight number
		char model[32]; // aircraft model
		char modelUID[128]; // unique sim aircraft variant id
	};

	static const VarDef vars[4];

	void GetModel(const VarDef** pArray, unsigned int* count) const override
	{
		*pArray = vars;
		*count = sizeof(vars) / sizeof(*vars);
	}
	const char* GetName() const override
	{
		return "AircraftIdent";
	}
};
const DataModel::VarDef AircraftIdent_Model::vars[] =
{
	{ VarType::STRING64, "ATC AIRLINE", nullptr },
	{ VarType::STRING8, "ATC FLIGHT NUMBER", nullptr },
	{ VarType::STRING32, "ATC MODEL", nullptr },
	{ VarType::STRING128, "TITLE", nullptr },
};

static AircraftIdent_Model identModel;
static AircraftTrack_Model trackModel;

LocalAircraft::LocalAircraft()
{
	radarId = 0;
	objectId = 0;
	spawned = false;
	trackInfo = {};
}

LocalAircraft::~LocalAircraft()
{
}

void LocalAircraft::Initialize()
{
	auto& client = simcom.GetSimConnect();
	client.RegisterDataModel(trackModel);
	client.RegisterDataModel(identModel);

	if (objectId != 0)
		Remove();
}

static void StringCopy(const char* src, size_t srcSize, char* dest, size_t destSize)
{
	auto size = strnlen_s(src, srcSize);
	if (size >= destSize)
		size = destSize - 1;
	memcpy(dest, src, size);
	dest[size] = 0;
}

void LocalAircraft::Set(unsigned int objId)
{
	if (objectId == objId)
		return;

	auto& client = simcom.GetSimConnect();

	if (objectId != 0)
	{
		Logger::LogWarn("Replacing local aircraft");
		Remove();
	}
	objectId = objId;

	client.RequestDataOnSimObject(objId, identModel, [this](void* data, SimConnect::ObjectId objId)
		{
			if (objectId != objId)
			{
				Logger::LogDebug("Rejected Ident response - local aircraft has changed");
				return;
			}

			auto& info = *reinterpret_cast<AircraftIdent_Model::AircraftIdent*>(data);
			info.airline[sizeof(info.airline) - 1] = 0;
			info.number[sizeof(info.number) - 1] = 0;

			callsign = std::format("{}{}", info.airline, info.number);
			model = info.model;

			Logger::Log("Local Aircraft identified: {} - {} - type: {} variant: {}||", objId, callsign, model, info.modelUID);
			Track();
		});
}

void LocalAircraft::Track()
{
	auto& client = simcom.GetSimConnect();

	radarId = client.RequestDataOnSimObject(SimConnect::ObjectIdUser, trackModel, [this](void* data, SimConnect::ObjectId)
		{
			auto& info = *reinterpret_cast<AircraftTrack_Model::AircraftTrack*>(data);

			if (info.longitude < 1 && info.longitude > -1 &&
				info.latitude < 1 && info.latitude > -1 &&
				info.altitude < 1000)
				return;

			trackInfo = info;

			if (!spawned)
			{
				spawned = true;
				Logger::Log("Spawned Local Aircraft");

				if (OnAdd)
				{
					PlaneAddArgs e;
					e.callsign = callsign;
					e.model = model;

					e.longitude = info.longitude;
					e.latitude = info.latitude;
					e.heading = info.heading;

					e.altitude = info.altitude;
					e.groundAltitude = info.groundAltitude;

					e.indicatedSpeed = info.indicatedSpeed;
					e.groundSpeed = info.groundSpeed;
					e.verticalSpeed = info.verticalSpeed;

					e.realAltitude = info.realAltitude;
					e.realHeading = info.realHeading;
					OnAdd(e);
				}
				return;
			}
			
			if (OnUpdate)
			{
				PlaneUpdateArgs e;
				e.longitude = info.longitude;
				e.latitude = info.latitude;
				e.heading = info.heading;

				e.altitude = info.altitude;
				e.groundAltitude = info.groundAltitude;

				e.indicatedSpeed = info.indicatedSpeed;
				e.groundSpeed = info.groundSpeed;
				e.verticalSpeed = info.verticalSpeed;

				e.realAltitude = info.realAltitude;
				e.realHeading = info.realHeading;
				OnUpdate(e);
			}
		}, RequestPeriod::SECOND);
}

void LocalAircraft::Remove()
{
	if (spawned && OnRemove)
	{
		OnRemove();
	}
	Logger::LogDebug("Removed local aircraft");

	auto& client = simcom.GetSimConnect();
	if (radarId != 0)
		client.CancelDataOnSimObject(radarId);

	spawned = false;
	radarId = 0;
	objectId = 0;
	trackInfo = {};
	callsign.clear();
	model.clear();
}

void LocalAircraft::Resync()
{
	if (!spawned || !OnResync)
		return;

	PlaneAddArgs e;
	e.callsign = callsign;
	e.model = model;

	e.longitude = trackInfo.longitude;
	e.latitude = trackInfo.latitude;
	e.heading = trackInfo.heading;

	e.altitude = trackInfo.altitude;
	e.groundAltitude = trackInfo.groundAltitude;

	e.indicatedSpeed = trackInfo.indicatedSpeed;
	e.groundSpeed = trackInfo.groundSpeed;
	e.verticalSpeed = trackInfo.verticalSpeed;

	e.realAltitude = trackInfo.realAltitude;
	e.realHeading = trackInfo.realHeading;
	OnResync(e);
}
