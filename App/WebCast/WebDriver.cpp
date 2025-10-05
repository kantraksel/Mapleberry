#include "WebDriver.hpp"
#include "WebCast.hpp"
#include "SimCom/SimCom.h"
#include "Utils/Logger.h"
#include "MsgPacker.hpp"

extern SimCom simcom;
extern LocalAircraft aircraft;
extern AirplaneRadar radar;
extern WebCast webcast;

enum class SimState : uint8_t
{
	Disconnected = 1,
	Connected = 2,
};

WebDriver::WebDriver()
{
}

WebDriver::~WebDriver()
{
}

static void SetSimState(MsgPacker& packer, bool connected)
{
	if (!connected)
		packer.pack(static_cast<uint8_t>(SimState::Disconnected));
	else
	{
		packer.pack_array(2);
		packer.pack(static_cast<uint8_t>(SimState::Connected));
		packer.pack(simcom.GetSimName());
	}
}

static void SetSystemState(MsgPacker& packer, int simConnected)
{
	packer.pack_map(1);
	packer.pack(0);
	SetSimState(packer, simConnected);
}

static void SetSystemState(MsgPacker& packer)
{
	SetSystemState(packer, simcom.IsConnected());
}

static void SendSystemState(int simConnected)
{
	MsgPacker packer;
	SetSystemState(packer, simConnected);
	webcast.Send(MsgId::ModifySystemState, packer.view());
}

static void SendSystemState()
{
	SendSystemState(simcom.IsConnected());
}

void WebDriver::Initialize()
{
	using namespace std::placeholders;

	webcast.RegisterHandler(MsgId::SendAllData, std::bind(&WebDriver::OnRequestSendAllData, this, _1));
	webcast.RegisterHandler(MsgId::ModifySystemState, std::bind(&WebDriver::OnRequestModifySystemState, this, _1));
	webcast.RegisterHandler(MsgId::ModifySystemProperties, std::bind(&WebDriver::OnRequestModifySystemProperties, this, _1));

	radar.OnPlaneAdd = { MemberFunc<&WebDriver::OnRadarAdd>, this };
	radar.OnPlaneRemove = { MemberFunc<&WebDriver::OnRadarRemove>, this };
	radar.OnPlaneUpdate = { MemberFunc<&WebDriver::OnRadarUpdate>, this };

	aircraft.OnAdd = { MemberFunc<&WebDriver::OnUserAdd>, this };
	aircraft.OnRemove = { MemberFunc<&WebDriver::OnUserRemove>, this };
	aircraft.OnUpdate = { MemberFunc<&WebDriver::OnUserUpdate>, this };
}

static void PackPartialRadarUpdate(MsgPacker& packer, const AirplaneRadar::PlaneUpdateArgs& e)
{
	packer.pack(0, e.id);
	packer.pack(1, e.longitude);
	packer.pack(2, e.latitude);
	packer.pack(3, e.heading);
	packer.pack(4, e.altitude);
	packer.pack(5, e.groundAltitude);
	packer.pack(6, e.indicatedSpeed);
	packer.pack(7, e.groundSpeed);
	packer.pack(8, e.verticalSpeed);
}

static void PackRadarAdd(MsgPacker& packer, const AirplaneRadar::PlaneAddArgs& e)
{
	packer.pack_map(11);
	PackPartialRadarUpdate(packer, e);
	packer.pack(9, e.model);
	packer.pack(10, e.callsign);
}

static void PackRadarUpdate(MsgPacker& packer, const AirplaneRadar::PlaneUpdateArgs& e)
{
	packer.pack_map(9);
	PackPartialRadarUpdate(packer, e);
}

static void PackPartialLocalUpdate(MsgPacker& packer, const LocalAircraft::PlaneUpdateArgs& e)
{
	packer.pack(0, e.longitude);
	packer.pack(1, e.latitude);
	packer.pack(2, e.heading);
	packer.pack(3, e.altitude);
	packer.pack(4, e.groundAltitude);
	packer.pack(5, e.indicatedSpeed);
	packer.pack(6, e.groundSpeed);
	packer.pack(7, e.verticalSpeed);
	packer.pack(8, e.realAltitude);
	packer.pack(9, e.realHeading);
}

static void PackLocalAdd(MsgPacker& packer, const LocalAircraft::PlaneAddArgs& e)
{
	packer.pack_map(12);
	PackPartialLocalUpdate(packer, e);
	packer.pack(10, e.model);
	packer.pack(11, e.callsign);
}

static void PackLocalUpdate(MsgPacker& packer, const LocalAircraft::PlaneUpdateArgs& e)
{
	packer.pack_map(10);
	PackPartialLocalUpdate(packer, e);
}

void WebDriver::OnSimConnect()
{
	SendSystemState(1);
}

void WebDriver::OnSimDisconnect()
{
	SendSystemState(0);
}

void WebDriver::OnRadarAdd(const AirplaneRadar::PlaneAddArgs& e)
{
	MsgPacker packer;
	PackRadarAdd(packer, e);
	webcast.Send(MsgId::RadarAddAircraft, packer.view());
}

void WebDriver::OnRadarRemove(const AirplaneRadar::PlaneRemoveArgs& e)
{
	MsgPacker packer;

	packer.pack_map(1);
	packer.pack(0, e.id);

	webcast.Send(MsgId::RadarRemoveAircraft, packer.view());
}

void WebDriver::OnRadarUpdate(const AirplaneRadar::PlaneUpdateArgs& e)
{
	MsgPacker packer;
	PackRadarUpdate(packer, e);
	webcast.Send(MsgId::RadarUpdateAircraft, packer.view());
}

void WebDriver::OnUserAdd(const LocalAircraft::PlaneAddArgs& e)
{
	MsgPacker packer;
	PackLocalAdd(packer, e);
	webcast.Send(MsgId::LocalAddAircraft, packer.view());
}

void WebDriver::OnUserRemove()
{
	MsgPacker packer;
	webcast.Send(MsgId::LocalRemoveAircraft, packer.view());
}

void WebDriver::OnUserUpdate(const LocalAircraft::PlaneUpdateArgs& e)
{
	MsgPacker packer;
	PackLocalUpdate(packer, e);
	webcast.Send(MsgId::LocalUpdateAircraft, packer.view());
}

void WebDriver::OnRequestSendAllData(const FixedArrayCharS&)
{
	auto airplanes = radar.CreateSnapshot();
	auto user = aircraft.CreateSnapshot();

	MsgPacker packer;
	packer.pack_map(3);

	packer.pack(0);
	packer.pack_array((uint32_t)airplanes.size());
	for (auto& a : airplanes)
	{
		PackRadarAdd(packer, a);
	}

	packer.pack(1);
	if (user)
		PackLocalAdd(packer, *user);
	else
		packer.packer.pack_nil();
	
	packer.pack(2);
	SetSystemState(packer, simcom.IsConnected());

	webcast.Send(MsgId::SendAllData, packer.view());
}

void WebDriver::OnRequestModifySystemState(const FixedArrayCharS& buffer)
{
	auto handle = msgpack::unpack(buffer, buffer.size());
	auto& obj = handle.get();
	if (obj.type != msgpack::type::MAP)
		return;

	std::string str;
	auto& map = obj.via.map;
	for (auto i = msgpack::begin(map); i != msgpack::end(map); ++i)
	{
		auto& key = i->key;
		if (key.type != msgpack::type::STR)
			continue;
		str.clear();
		key.convert(str);

		auto& value = i->val;
		if (str == "0")
		{
			if (value.type == msgpack::type::BOOLEAN)
			{
				bool v = value.as<bool>();
				if (v)
				{
					if (simcom.IsConnected())
						SendSystemState();
					else
						simcom.Initialize();
				}
				else
				{
					if (simcom.IsConnected())
						simcom.Shutdown();
					else
						SendSystemState();
				}
			}
		}
	}
}

void WebDriver::OnRequestModifySystemProperties(const FixedArrayCharS& buffer)
{
	auto handle = msgpack::unpack(buffer, buffer.size());
	auto& obj = handle.get();
	if (obj.type != msgpack::type::MAP)
		return;

	std::string str;
	auto& map = obj.via.map;
	for (auto i = msgpack::begin(map); i != msgpack::end(map); ++i)
	{
		auto& key = i->key;
		if (key.type != msgpack::type::STR)
			continue;
		str.clear();
		key.convert(str);

		auto& value = i->val;
		if (str == "0")
		{
			if (value.type == msgpack::type::BOOLEAN)
			{
				bool v = value.as<bool>();
				simcom.AllowReconnect(v);
			}
		}
	}
}
