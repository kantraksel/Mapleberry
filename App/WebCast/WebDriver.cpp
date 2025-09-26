#include "WebDriver.hpp"
#include "WebCast.hpp"
#include "App/RealTimeThread.h"
#include "SimCom/SimCom.h"
#include "DeviceServer/DeviceServer.h"
#include "App/DeviceManager.h"
#include "Utils/Logger.h"
#include "App/AirplaneRadar.h"
#include "App/LocalAircraft.h"
#include "MsgPacker.hpp"

extern SimCom simcom;
extern DeviceServer deviceServer;
extern DeviceManager deviceManager;
extern LocalAircraft aircraft;
extern AirplaneRadar radar;
extern RealTimeThread thread;
extern WebCast webcast;
extern WebDriver webdriver;

enum class RxCmd
{
	Undefined,
	Resync,
	ChangeSimComStatus,
	ChangeServerStatus,
	ReconnectToSim,
};

enum class SimState : uint8_t
{
	Disconnected = 1,
	Connected = 2,
};

enum class SrvState : uint8_t
{
	Stoppped = 1,
	Running = 2,
	Connected = 3,
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
		std::string str;
		{
			auto lock = thread.EnterCmdMode();
			str = simcom.GetSimName();
		}

		packer.pack_array(2);
		packer.pack(static_cast<uint8_t>(SimState::Connected));
		packer.pack(str);
	}
}

static void SetSrvState(MsgPacker& packer, bool isServerRunning, bool isDeviceConnected)
{
	if (!isServerRunning)
		packer.pack(static_cast<uint8_t>(SrvState::Stoppped));
	else if (isDeviceConnected)
		packer.pack(static_cast<uint8_t>(SrvState::Connected));
	else
		packer.pack(static_cast<uint8_t>(SrvState::Running));
}

static void SendSystemState(int simConnected = -1, int serverRunning = -1, int deviceConnected = -1)
{
	if (simConnected == -1)
		simConnected = simcom.IsConnected();
	if (serverRunning == -1)
		serverRunning = deviceServer.IsRunning();
	if (deviceConnected == -1)
		deviceConnected = deviceManager.IsConnected();

	MsgPacker packer;

	packer.pack_map(2);
	packer.pack(0);
	SetSimState(packer, simConnected);
	packer.pack(1);
	SetSrvState(packer, serverRunning, deviceConnected);

	webcast.Send(MsgId::ModifySystemState, packer.view());
}

static void PackRadarAdd(MsgPacker& packer, const AirplaneRadar::PlaneAddArgs& e);
static void PackRadarUpdate(MsgPacker& packer, const AirplaneRadar::PlaneUpdateArgs& e);
static void PackLocalAdd(MsgPacker& packer, const LocalAircraft::PlaneAddArgs& e);
static void PackLocalUpdate(MsgPacker& packer, const LocalAircraft::PlaneUpdateArgs& e);

void WebDriver::Initialize()
{
	thread.SimConnectEvent = []()
		{
			SendSystemState(1);
		};
	thread.SimDisconnectEvent = []()
		{
			SendSystemState(0);
		};
	thread.Tick = []()
		{
			webdriver.CommitRxMessages();
		};

	deviceServer.OnStart = []()
		{
			SendSystemState(-1, 1);
		};
	deviceServer.OnStop = []()
		{
			SendSystemState(-1, 0);
		};

	deviceManager.DeviceConnectEvent = []()
		{
			SendSystemState(-1, -1, 1);
		};
	deviceManager.DeviceDisconnectEvent = []()
		{
			SendSystemState(-1, -1, 0);
		};

	webcast.RegisterHandler(MsgId::SendAllData, [this](const auto&)
							 {
								 SendSystemState();
								 PushRxMessage(RxCmd::Resync, 0);
							 });

	webcast.RegisterHandler(MsgId::ModifySystemState, [this](const FixedArrayCharS& buffer)
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
											PushRxMessage(RxCmd::ChangeSimComStatus, v);
										}
									}
									else if (str == "1")
									{
										if (value.type == msgpack::type::BOOLEAN)
										{
											bool v = value.as<bool>();
											PushRxMessage(RxCmd::ChangeServerStatus, v);
										}
									}
								}
							});

	webcast.RegisterHandler(MsgId::ModifySystemProperties, [this](const auto& buffer)
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
											PushRxMessage(RxCmd::ReconnectToSim, v);
										}
									}
								}
							});

	radar.OnPlaneAdd = [this](const AirplaneRadar::PlaneAddArgs& e)
		{
			MsgPacker packer;
			PackRadarAdd(packer, e);
			webcast.Send(MsgId::RadarAddAircraft, packer.view());
		};
	radar.OnPlaneRemove = [this](const AirplaneRadar::PlaneRemoveArgs& e)
		{
			MsgPacker packer;

			packer.pack_map(1);
			packer.pack(0, e.id);

			webcast.Send(MsgId::RadarRemoveAircraft, packer.view());
		};
	radar.OnPlaneUpdate = [this](const AirplaneRadar::PlaneUpdateArgs& e)
		{
			MsgPacker packer;
			PackRadarUpdate(packer, e);
			webcast.Send(MsgId::RadarUpdateAircraft, packer.view());
		};
	radar.OnResync = [this](const std::vector<AirplaneRadar::PlaneAddArgs>& e)
		{
			MsgPacker packer;
			packer.pack_array((uint32_t)e.size());
			for (auto& a : e)
			{
				PackRadarAdd(packer, a);
			}

			if (!resyncMsg)
				resyncMsg = std::make_pair(packer.copy_buffer(), FixedArrayCharS{});
			else
			{
				auto buffer = packer.copy_buffer();
				packer.clear();

				packer.pack_array(2);
				packer.write_raw(buffer);
				packer.write_raw(resyncMsg->second);
				resyncMsg.reset();

				webcast.Send(MsgId::SendAllData, packer.view());
			}
		};

	aircraft.OnAdd = [this](const LocalAircraft::PlaneAddArgs& e)
		{
			MsgPacker packer;
			PackLocalAdd(packer, e);
			webcast.Send(MsgId::LocalAddAircraft, packer.view());
		};
	aircraft.OnRemove = [this]()
		{
			MsgPacker packer;
			webcast.Send(MsgId::LocalRemoveAircraft, packer.view());
		};
	aircraft.OnUpdate = [this](const LocalAircraft::PlaneUpdateArgs& e)
		{
			MsgPacker packer;
			PackLocalUpdate(packer, e);
			webcast.Send(MsgId::LocalUpdateAircraft, packer.view());
		};
	aircraft.OnResync = [this](const LocalAircraft::PlaneAddArgs& e)
		{
			MsgPacker packer;
			PackLocalAdd(packer, e);

			if (!resyncMsg)
				resyncMsg = std::make_pair(FixedArrayCharS{}, packer.copy_buffer());
			else
			{
				auto buffer = packer.copy_buffer();
				packer.clear();

				packer.pack_array(2);
				packer.write_raw(resyncMsg->first);
				packer.write_raw(buffer);
				resyncMsg.reset();

				webcast.Send(MsgId::SendAllData, packer.view());
			}
		};
}

void WebDriver::PushRxMessage(RxCmd id, uint64_t value)
{
	std::lock_guard lock(rxQueueMutex);
	rxQueue.emplace(id, value);
}

void WebDriver::CommitRxMessages()
{
	std::unique_lock lock(rxQueueMutex);
	while (!rxQueue.empty())
	{
		std::pair<RxCmd, uint64_t> pair = std::move(rxQueue.front());
		rxQueue.pop();

		lock.unlock();
		HandleRxMessages(pair.first, pair.second);
		lock.lock();
	}
}

void WebDriver::HandleRxMessages(RxCmd id, uint64_t value)
{
	switch (id)
	{
		case RxCmd::Resync:
		{
			radar.Resync();
			aircraft.Resync();
			break;
		}

		case RxCmd::ChangeSimComStatus:
		{
			if (value)
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
			break;
		}

		case RxCmd::ChangeServerStatus:
		{
			if (value)
			{
				if (deviceServer.IsRunning())
					SendSystemState();
				else
					deviceServer.Start();
			}
			else
			{
				if (deviceServer.IsRunning())
					deviceServer.Stop();
				else
					SendSystemState();
			}
			break;
		}

		case RxCmd::ReconnectToSim:
		{
			simcom.AllowReconnect(value);
			break;
		}
	}
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
