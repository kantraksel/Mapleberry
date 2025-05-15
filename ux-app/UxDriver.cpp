#include "UxDriver.h"
#include "UxBridge.h"
#include "WindowManager.h"
#include "App/GlobalScope.h"
#include "App/RealTimeThread.h"
#include "SimCom/SimCom.h"
#include "DeviceServer/DeviceServer.h"
#include "App/DeviceManager.h"
#include "Utils/Logger.h"
#include "App/AirplaneRadar.h"
#include "App/LocalAircraft.h"

extern WindowManager window;
extern UxBridge uxbridge;

enum class WndMsgCmd : uint64_t
{
	Undefined,
	CommitMsgQueue,
	SimConnectEvent,
	SimDisconnectEvent,
	ServerStartEvent,
	ServerStopEvent,
	DeviceConnectEvent,
	DeviceDisconnectEvent,
};

static inline void PostCommand(WndMsgCmd cmd, uint64_t param = 0)
{
	window.PostMessage(static_cast<uint64_t>(cmd), param);
}

UxDriver::UxDriver()
{
}

UxDriver::~UxDriver()
{
}

static void SetSimState(nlohmann::json& json, bool connected)
{
	auto& simcom = GlobalScope::GetSimCom();

	int simStatus = 1;
	if (connected)
	{
		simStatus = 2;

		std::string str;
		{
			auto& thread = GlobalScope::GetRealTimeThread();
			auto lock = thread.EnterCmdMode();
			str = simcom.GetSimName();
		}
		json["simName"] = str;
	}
	json["simStatus"] = simStatus;
}

static void SetSrvState(nlohmann::json& json, bool isServerRunning, bool isDeviceConnected)
{
	int srvStatus = 1;
	if (isServerRunning)
	{
		srvStatus = 2;
		if (isDeviceConnected)
			srvStatus = 3;
	}
	json["srvStatus"] = srvStatus;
}

static void SendSystemState(int simConnected = -1, int serverRunning = -1, int deviceConnected = -1)
{
	auto& simcom = GlobalScope::GetSimCom();
	auto& server = GlobalScope::GetDeviceServer();
	auto& dvcMgr = GlobalScope::GetDeviceManager();

	if (simConnected == -1)
		simConnected = simcom.IsConnected();
	if (serverRunning == -1)
		serverRunning = server.IsRunning();
	if (deviceConnected == -1)
		deviceConnected = dvcMgr.IsConnected();

	nlohmann::json json;
	
	SetSimState(json, simConnected);
	SetSrvState(json, serverRunning, deviceConnected);
	
	uxbridge.Send("SRV_STATE", json);
}

void UxDriver::Initialize()
{
	auto& thread = GlobalScope::GetRealTimeThread();
	auto& server = GlobalScope::GetDeviceServer();
	auto& dvcMgr = GlobalScope::GetDeviceManager();
	auto& radar = GlobalScope::GetAirplaneRadar();
	auto& aircraft = GlobalScope::GetLocalAircraft();

	window.OnUserMessage = [this](uint64_t wParam, uint64_t lParam)
		{
			switch (static_cast<WndMsgCmd>(wParam))
			{
				case WndMsgCmd::SimConnectEvent:
				{
					SendSystemState(1);
					break;
				}

				case WndMsgCmd::SimDisconnectEvent:
				{
					SendSystemState(0);
					break;
				}

				case WndMsgCmd::ServerStartEvent:
				{
					SendSystemState(-1, 1);
					break;
				}

				case WndMsgCmd::ServerStopEvent:
				{
					SendSystemState(-1, 0);
					break;
				}

				case WndMsgCmd::DeviceConnectEvent:
				{
					SendSystemState(-1, -1, 1);
					break;
				}

				case WndMsgCmd::DeviceDisconnectEvent:
				{
					SendSystemState(-1, -1, 0);
					break;
				}

				case WndMsgCmd::CommitMsgQueue:
				{
					CommitMessages();
					break;
				}

				default:
				{
					Logger::LogWarn("Unknown user message {}", wParam);
					break;
				}
			}
		};

	thread.SimConnectEvent = []()
		{
			PostCommand(WndMsgCmd::SimConnectEvent);
		};
	thread.SimDisconnectEvent = []()
		{
			PostCommand(WndMsgCmd::SimDisconnectEvent);
		};

	server.OnStart = []()
		{
			PostCommand(WndMsgCmd::ServerStartEvent);
		};
	server.OnStop = []()
		{
			PostCommand(WndMsgCmd::ServerStopEvent);
		};

	dvcMgr.DeviceConnectEvent = []()
		{
			PostCommand(WndMsgCmd::DeviceConnectEvent);
		};
	dvcMgr.DeviceDisconnectEvent = []()
		{
			PostCommand(WndMsgCmd::DeviceDisconnectEvent);
		};

	uxbridge.RegisterHandler("ALL_RQST_STATE", [](const nlohmann::json& json)
		{
			auto& thread = GlobalScope::GetRealTimeThread();
			auto& radar = GlobalScope::GetAirplaneRadar();
			auto& aircraft = GlobalScope::GetLocalAircraft();

			SendSystemState();
			auto lock = thread.EnterCmdMode();
			radar.Resync();
			aircraft.Resync();
		});

	uxbridge.RegisterHandler("SRV_MODIFY", [](const nlohmann::json& json)
		{
			auto& thread = GlobalScope::GetRealTimeThread();
			auto& simcom = GlobalScope::GetSimCom();
			auto& server = GlobalScope::GetDeviceServer();

			auto simConnNode = json.find("simConnection");
			if (simConnNode != json.end() && simConnNode->is_boolean())
			{
				bool value = *simConnNode;
				auto lock = thread.EnterCmdMode();
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
			}

			auto srvOpenNode = json.find("serverOpen");
			if (srvOpenNode != json.end() && srvOpenNode->is_boolean())
			{
				bool value = *srvOpenNode;
				auto lock = thread.EnterCmdMode();
				if (value)
				{
					if (server.IsRunning())
						SendSystemState();
					else
						server.Start();
				}
				else
				{
					if (server.IsRunning())
						server.Stop();
					else
						SendSystemState();
				}
			}
		});

	radar.OnPlaneAdd = [this](const AirplaneRadar::PlaneAddArgs& e)
		{
			nlohmann::json json;
			json["id"] = e.id;
			json["planeModel"] = e.model;
			json["callsign"] = e.callsign;

			PushMessage("FLT_ADD", json);
		};
	radar.OnPlaneRemove = [this](const AirplaneRadar::PlaneRemoveArgs& e)
		{
			nlohmann::json json;
			json["id"] = e.id;

			PushMessage("FLT_REMOVE", json);
		};
	radar.OnPlaneUpdate = [this](const AirplaneRadar::PlaneUpdateArgs& e)
		{
			nlohmann::json json;
			json["id"] = e.id;
			json["longitude"] = e.longitude;
			json["latitude"] = e.latitude;
			json["heading"] = e.heading;
			json["altitude"] = e.altitude;
			json["groundAltitude"] = e.groundAltitude;
			json["indicatedSpeed"] = e.indicatedSpeed;
			json["groundSpeed"] = e.groundSpeed;
			json["verticalSpeed"] = e.verticalSpeed;

			PushMessage("FLT_UPDATE", json);
		};

	aircraft.OnAdd = [this](const LocalAircraft::PlaneAddArgs& e)
		{
			nlohmann::json json;
			json["planeModel"] = e.model;
			json["callsign"] = e.callsign;

			PushMessage("UAC_ADD", json);
		};
	aircraft.OnRemove = [this]()
		{
			nlohmann::json json;

			PushMessage("UAC_REMOVE", json);
		};
	aircraft.OnUpdate = [this](const LocalAircraft::PlaneUpdateArgs& e)
		{
			nlohmann::json json;
			json["longitude"] = e.longitude;
			json["latitude"] = e.latitude;
			json["heading"] = e.heading;
			json["altitude"] = e.altitude;
			json["groundAltitude"] = e.groundAltitude;
			json["indicatedSpeed"] = e.indicatedSpeed;
			json["groundSpeed"] = e.groundSpeed;
			json["verticalSpeed"] = e.verticalSpeed;
			json["realAltitude"] = e.realAltitude;
			json["realHeading"] = e.realHeading;

			PushMessage("UAC_UPDATE", json);
		};
}

void UxDriver::PushMessage(const std::string_view& id, nlohmann::json& content)
{
	auto sid = std::string(id);
	{
		std::lock_guard lock(msgQueueMutex);
		msgQueue.emplace(std::move(sid), std::move(content));
	}
	PostCommand(WndMsgCmd::CommitMsgQueue);
}

void UxDriver::CommitMessages()
{
	std::lock_guard lock(msgQueueMutex);
	while (!msgQueue.empty())
	{
		auto& pair = msgQueue.front();
		uxbridge.Send(pair.first, pair.second);
		msgQueue.pop();
	}
}
