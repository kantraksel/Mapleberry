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
extern UxDriver uxdriver;

enum class TxCmd : uint64_t
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

enum class RxCmd
{
	Undefined,
	Resync,
	ChangeSimComStatus,
	ChangeServerStatus,
	ReconnectToSim,
};

static inline void PostCommand(TxCmd cmd, uint64_t param = 0)
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
			switch (static_cast<TxCmd>(wParam))
			{
				case TxCmd::SimConnectEvent:
				{
					SendSystemState(1);
					break;
				}

				case TxCmd::SimDisconnectEvent:
				{
					SendSystemState(0);
					break;
				}

				case TxCmd::ServerStartEvent:
				{
					SendSystemState(-1, 1);
					break;
				}

				case TxCmd::ServerStopEvent:
				{
					SendSystemState(-1, 0);
					break;
				}

				case TxCmd::DeviceConnectEvent:
				{
					SendSystemState(-1, -1, 1);
					break;
				}

				case TxCmd::DeviceDisconnectEvent:
				{
					SendSystemState(-1, -1, 0);
					break;
				}

				case TxCmd::CommitMsgQueue:
				{
					CommitTxMessages();
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
			PostCommand(TxCmd::SimConnectEvent);
		};
	thread.SimDisconnectEvent = []()
		{
			PostCommand(TxCmd::SimDisconnectEvent);
		};
	thread.Tick = []()
		{
			uxdriver.CommitRxMessages();
		};

	server.OnStart = []()
		{
			PostCommand(TxCmd::ServerStartEvent);
		};
	server.OnStop = []()
		{
			PostCommand(TxCmd::ServerStopEvent);
		};

	dvcMgr.DeviceConnectEvent = []()
		{
			PostCommand(TxCmd::DeviceConnectEvent);
		};
	dvcMgr.DeviceDisconnectEvent = []()
		{
			PostCommand(TxCmd::DeviceDisconnectEvent);
		};

	uxbridge.RegisterHandler("SRV_RESYNC", [this](const nlohmann::json& json)
		{
			SendSystemState();
			PushRxMessage(RxCmd::Resync, 0);
		});

	uxbridge.RegisterHandler("SRV_MODIFY", [this](const nlohmann::json& json)
		{
			auto simConnNode = json.find("simConnection");
			if (simConnNode != json.end() && simConnNode->is_boolean())
			{
				bool value = *simConnNode;
				PushRxMessage(RxCmd::ChangeSimComStatus, value);
			}

			auto srvOpenNode = json.find("serverOpen");
			if (srvOpenNode != json.end() && srvOpenNode->is_boolean())
			{
				bool value = *srvOpenNode;
				PushRxMessage(RxCmd::ChangeServerStatus, value);
			}
		});

	uxbridge.RegisterHandler("SRV_PROPS", [this](const nlohmann::json& json)
		{
			auto simConnNode = json.find("reconnectToSim");
			if (simConnNode != json.end() && simConnNode->is_boolean())
			{
				bool value = *simConnNode;
				PushRxMessage(RxCmd::ReconnectToSim, value);
			}
		});

	radar.OnPlaneAdd = [this](const AirplaneRadar::PlaneAddArgs& e)
		{
			nlohmann::json json;
			json["id"] = e.id;
			json["planeModel"] = e.model;
			json["callsign"] = e.callsign;
			json["longitude"] = e.longitude;
			json["latitude"] = e.latitude;
			json["heading"] = e.heading;
			json["altitude"] = e.altitude;
			json["groundAltitude"] = e.groundAltitude;
			json["indicatedSpeed"] = e.indicatedSpeed;
			json["groundSpeed"] = e.groundSpeed;
			json["verticalSpeed"] = e.verticalSpeed;

			PushTxMessage("FLT_ADD", json);
		};
	radar.OnPlaneRemove = [this](const AirplaneRadar::PlaneRemoveArgs& e)
		{
			nlohmann::json json;
			json["id"] = e.id;

			PushTxMessage("FLT_REMOVE", json);
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

			PushTxMessage("FLT_UPDATE", json);
		};
	radar.OnResync = [this](const std::vector<AirplaneRadar::PlaneAddArgs>& e)
		{
			nlohmann::json json;
			for (auto& a : e)
			{
				nlohmann::json node;
				node["id"] = a.id;
				node["planeModel"] = a.model;
				node["callsign"] = a.callsign;
				node["longitude"] = a.longitude;
				node["latitude"] = a.latitude;
				node["heading"] = a.heading;
				node["altitude"] = a.altitude;
				node["groundAltitude"] = a.groundAltitude;
				node["indicatedSpeed"] = a.indicatedSpeed;
				node["groundSpeed"] = a.groundSpeed;
				node["verticalSpeed"] = a.verticalSpeed;

				json.emplace_back(std::move(node));
			}

			if (!resyncMsg)
				resyncMsg = std::make_pair(std::move(json), nlohmann::json{});
			else
			{
				resyncMsg->first = std::move(json);
				json.clear();
				json["radar"] = std::move(resyncMsg->first);
				json["user"] = std::move(resyncMsg->second);
				resyncMsg.reset();

				PushTxMessage("SRV_RESYNC", json);
			}
		};

	aircraft.OnAdd = [this](const LocalAircraft::PlaneAddArgs& e)
		{
			nlohmann::json json;
			json["planeModel"] = e.model;
			json["callsign"] = e.callsign;
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

			PushTxMessage("UAC_ADD", json);
		};
	aircraft.OnRemove = [this]()
		{
			nlohmann::json json;

			PushTxMessage("UAC_REMOVE", json);
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

			PushTxMessage("UAC_UPDATE", json);
		};
	aircraft.OnResync = [this](const LocalAircraft::PlaneAddArgs& e)
		{
			nlohmann::json json;
			json["planeModel"] = e.model;
			json["callsign"] = e.callsign;
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

			if (!resyncMsg)
				resyncMsg = std::make_pair(nlohmann::json{}, std::move(json));
			else
			{
				resyncMsg->second = std::move(json);
				json.clear();
				json["radar"] = std::move(resyncMsg->first);
				json["user"] = std::move(resyncMsg->second);
				resyncMsg.reset();

				PushTxMessage("SRV_RESYNC", json);
			}
		};
}

void UxDriver::PushTxMessage(const std::string_view& id, nlohmann::json& content)
{
	auto sid = std::string(id);
	{
		std::lock_guard lock(txQueueMutex);
		txQueue.emplace(std::move(sid), std::move(content));
	}
	PostCommand(TxCmd::CommitMsgQueue);
}

void UxDriver::CommitTxMessages()
{
	std::unique_lock lock(txQueueMutex);
	while (!txQueue.empty())
	{
		std::pair<std::string, nlohmann::json> pair = std::move(txQueue.front());
		txQueue.pop();

		lock.unlock();
		uxbridge.Send(pair.first, pair.second);
		lock.lock();
	}
}

void UxDriver::PushRxMessage(RxCmd id, uint64_t value)
{
	std::lock_guard lock(rxQueueMutex);
	rxQueue.emplace(id, value);
}

void UxDriver::CommitRxMessages()
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

void UxDriver::HandleRxMessages(RxCmd id, uint64_t value)
{
	switch (id)
	{
		case RxCmd::Resync:
		{
			auto& radar = GlobalScope::GetAirplaneRadar();
			auto& aircraft = GlobalScope::GetLocalAircraft();
			radar.Resync();
			aircraft.Resync();
			break;
		}

		case RxCmd::ChangeSimComStatus:
		{
			auto& simcom = GlobalScope::GetSimCom();
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
			auto& server = GlobalScope::GetDeviceServer();
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
			break;
		}

		case RxCmd::ReconnectToSim:
		{
			auto& simcom = GlobalScope::GetSimCom();
			simcom.AllowReconnect(value);
			break;
		}
	}
}
