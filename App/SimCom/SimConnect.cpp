#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <SimConnect.h>
#include "SimConnect.h"
#include "Utils/Time.h"
#include "Utils/Logger.h"

using namespace SimConnect;
static_assert(ObjectIdUser == SIMCONNECT_OBJECT_ID_USER);

enum class SystemEvents : DWORD
{
	Reserved,
	ObjectAdded,
	ObjectRemoved,
	SimStart,
	SimStop,
	Pause,
	UserEvents,
};

Client::Client() : hSimConnect(0), nextModelId(1), nextRequestId(1), nextEventId((unsigned int)SystemEvents::UserEvents)
{
}

Client::~Client()
{
	Shutdown();
}

bool Client::Initialize(const char* name)
{
	if (hSimConnect)
		Shutdown();

	auto hr = SimConnect_Open(&hSimConnect, name, 0, 0, 0, 0);
	if (FAILED(hr))
	{
		hSimConnect = 0;
		return false;
	}
	nextModelId = 1;
	nextRequestId = 1;
	nextEventId = (unsigned int)SystemEvents::UserEvents;
	return true;
}

void Client::Shutdown()
{
	if (hSimConnect)
	{
		SimConnect_Close(hSimConnect);
		hSimConnect = 0;
	}

	eventConnect = {};
	eventDisconnect = {};
	eventException = {};
	eventObjectAdded = {};
	eventObjectRemoved = {};
	eventSimStart = {};
	eventSimStop = {};
	eventPause = {};
	requests.clear();
}

void Client::SetConnectCallback(const std::function<void(const EventServer& event)>& callback)
{
	eventConnect = callback;
}

void Client::SetDisconnectCallback(const std::function<void()>& callback)
{
	eventDisconnect = callback;
}

void Client::SetExceptionCallback(const std::function<void(const EventException& event)>& callback)
{
	eventException = callback;
}

static long long CreateTimeStamp()
{
	return Time::SteadyNowInt() + Time::SecondToMs(60);
}

static long long GetExpiredTimeStamp()
{
	return Time::SteadyNowInt();
}

static const char* StringifyError(DWORD e);
static ObjectType NativeToObjectType(SIMCONNECT_SIMOBJECT_TYPE type);

bool Client::RunCallbacks()
{
	if (!hSimConnect)
		return false;

	SIMCONNECT_RECV* pData = nullptr;
	DWORD cbData = 0;

	auto hr = SimConnect_GetNextDispatch(hSimConnect, &pData, &cbData);
	if (FAILED(hr))
		return false;

	switch (pData->dwID)
	{
		case SIMCONNECT_RECV_ID_NULL:
		{
			auto expiredTimeStamp = GetExpiredTimeStamp();

			for (auto i = requests.begin(); i != requests.end(); ++i)
			{
				if (i->timeStamp <= expiredTimeStamp)
				{
					Logger::LogDebug("SimConnect::Client: packet {} - request timed out", i->packetId);
					if (i == requests.begin())
					{
						requests.erase(i);
						i = requests.begin();
					}
					else
						requests.erase(i--);
				}
			}
			return false;
		}

		case SIMCONNECT_RECV_ID_EXCEPTION:
		{
			auto& info = *reinterpret_cast<SIMCONNECT_RECV_EXCEPTION*>(pData);
#if _DEBUG
			Logger::LogError("SimConnect::Client Exception: {} {} packet {} index {}", info.dwException, StringifyError(info.dwException), info.dwSendID, info.dwIndex);
#endif

			if (eventException)
			{
				EventException event
				{
					info.dwException,
					info.dwIndex,
					StringifyError(info.dwException),
				};
				eventException(event);
			}

			for (auto i = requests.begin(); i != requests.end(); ++i)
			{
				if (i->packetId == info.dwSendID)
				{
					Logger::LogDebug("SimConnect::Client: packet {} - request has been dismissed", info.dwSendID);
					requests.erase(i);
					break;
				}
			}
			break;
		}

		case SIMCONNECT_RECV_ID_OPEN:
		{
			if (!eventConnect)
				break;

			auto* info = reinterpret_cast<SIMCONNECT_RECV_OPEN*>(pData);
			EventServer event
			{
				info->szApplicationName,
				info->dwApplicationVersionMajor,
				info->dwApplicationVersionMinor,
				info->dwSimConnectVersionMajor,
				info->dwSimConnectVersionMinor,
			};
			eventConnect(event);
			break;
		}

		case SIMCONNECT_RECV_ID_QUIT:
		{
			if (eventDisconnect)
				eventDisconnect();
			Shutdown();
			break;
		}

		default:
		{
			Logger::LogWarn("SimConnect::Client: Unknown event {}", pData->dwID);
			break;
		}

		case SIMCONNECT_RECV_ID_EVENT_OBJECT_ADDREMOVE:
		{
			auto* info = reinterpret_cast<SIMCONNECT_RECV_EVENT_OBJECT_ADDREMOVE*>(pData);
			switch (info->uEventID)
			{
				case (DWORD)SystemEvents::ObjectAdded:
				{
					if (eventObjectAdded)
					{
						EventObject event
						{
							NativeToObjectType(info->eObjType),
							info->dwData,
						};
						eventObjectAdded(event);
					}
					break;
				}

				case (DWORD)SystemEvents::ObjectRemoved:
				{
					if (eventObjectRemoved)
					{
						EventObject event
						{
							NativeToObjectType(info->eObjType),
							info->dwData,
						};
						eventObjectRemoved(event);
					}
					break;
				}
			}
			break;
		}

		case SIMCONNECT_RECV_ID_SIMOBJECT_DATA:
		{
			auto* info = reinterpret_cast<SIMCONNECT_RECV_SIMOBJECT_DATA*>(pData);

			std::function<void(void* data, ObjectId objId)> callback;

			for (auto i = requests.begin(); i != requests.end(); ++i)
			{
				auto& event = *i;
				if (event.requestId == info->dwRequestID)
				{
					callback = event.callback;

					if (!event.repeatable)
						requests.erase(i);
					break;
				}
			}

			if (callback)
				callback(&info->dwData, info->dwObjectID);
			break;
		}

		case SIMCONNECT_RECV_ID_SIMOBJECT_DATA_BYTYPE:
		{
			auto* info = reinterpret_cast<SIMCONNECT_RECV_SIMOBJECT_DATA*>(pData);
			for (auto i = requests.begin(); i != requests.end(); ++i)
			{
				auto& event = *i;
				if (event.requestId == info->dwRequestID)
				{
					event.callback(&info->dwData, info->dwObjectID);
					break;
				}
			}
			break;
		}

		case SIMCONNECT_RECV_ID_EVENT:
		{
			auto* info = reinterpret_cast<SIMCONNECT_RECV_EVENT*>(pData);
			switch (info->uEventID)
			{
				case (DWORD)SystemEvents::SimStart:
				{
					if (eventSimStart)
						eventSimStart();
					break;
				}

				case (DWORD)SystemEvents::SimStop:
				{
					if (eventSimStop)
						eventSimStop();
					break;
				}

				case (DWORD)SystemEvents::Pause:
				{
					if (eventPause)
						eventPause(info->dwData != 0);
					break;
				}
			}

			break;
		}

		case SIMCONNECT_RECV_ID_EVENT_EX1:
		{
			auto* info = reinterpret_cast<SIMCONNECT_RECV_EVENT_EX1*>(pData);
			for (auto& event : events)
			{
				if (event.eventId == info->uEventID)
				{
					unsigned int data[5]
					{
						info->dwData0,
						info->dwData1,
						info->dwData2,
						info->dwData3,
						info->dwData4
					};
					event.callback(data);
					break;
				}
			}
		}
	}

	return true;
}

static const char* StringifyError(DWORD e)
{
	switch (e)
	{
		case SIMCONNECT_EXCEPTION_NONE:
			return "SIMCONNECT_EXCEPTION_NONE";
		case SIMCONNECT_EXCEPTION_ERROR:
			return "SIMCONNECT_EXCEPTION_ERROR";
		case SIMCONNECT_EXCEPTION_SIZE_MISMATCH:
			return "SIMCONNECT_EXCEPTION_SIZE_MISMATCH";
		case SIMCONNECT_EXCEPTION_UNRECOGNIZED_ID:
			return "SIMCONNECT_EXCEPTION_UNRECOGNIZED_ID";
		case SIMCONNECT_EXCEPTION_UNOPENED:
			return "SIMCONNECT_EXCEPTION_UNOPENED";
		case SIMCONNECT_EXCEPTION_VERSION_MISMATCH:
			return "SIMCONNECT_EXCEPTION_VERSION_MISMATCH";
		case SIMCONNECT_EXCEPTION_TOO_MANY_GROUPS:
			return "SIMCONNECT_EXCEPTION_TOO_MANY_GROUPS";
		case SIMCONNECT_EXCEPTION_NAME_UNRECOGNIZED:
			return "SIMCONNECT_EXCEPTION_NAME_UNRECOGNIZED";
		case SIMCONNECT_EXCEPTION_TOO_MANY_EVENT_NAMES:
			return "SIMCONNECT_EXCEPTION_TOO_MANY_EVENT_NAMES";
		case SIMCONNECT_EXCEPTION_EVENT_ID_DUPLICATE:
			return "SIMCONNECT_EXCEPTION_EVENT_ID_DUPLICATE";
		case SIMCONNECT_EXCEPTION_TOO_MANY_MAPS:
			return "SIMCONNECT_EXCEPTION_TOO_MANY_MAPS";
		case SIMCONNECT_EXCEPTION_TOO_MANY_OBJECTS:
			return "SIMCONNECT_EXCEPTION_TOO_MANY_OBJECTS";
		case SIMCONNECT_EXCEPTION_TOO_MANY_REQUESTS:
			return "SIMCONNECT_EXCEPTION_TOO_MANY_REQUESTS";
		case SIMCONNECT_EXCEPTION_WEATHER_INVALID_PORT:
			return "SIMCONNECT_EXCEPTION_WEATHER_INVALID_PORT";
		case SIMCONNECT_EXCEPTION_WEATHER_INVALID_METAR:
			return "SIMCONNECT_EXCEPTION_WEATHER_INVALID_METAR";
		case SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_GET_OBSERVATION:
			return "SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_GET_OBSERVATION";
		case SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_CREATE_STATION:
			return "SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_CREATE_STATION";
		case SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_REMOVE_STATION:
			return "SIMCONNECT_EXCEPTION_WEATHER_UNABLE_TO_REMOVE_STATION";
		case SIMCONNECT_EXCEPTION_INVALID_DATA_TYPE:
			return "SIMCONNECT_EXCEPTION_INVALID_DATA_TYPE";
		case SIMCONNECT_EXCEPTION_INVALID_DATA_SIZE:
			return "SIMCONNECT_EXCEPTION_INVALID_DATA_SIZE";
		case SIMCONNECT_EXCEPTION_DATA_ERROR:
			return "SIMCONNECT_EXCEPTION_DATA_ERROR";
		case SIMCONNECT_EXCEPTION_INVALID_ARRAY:
			return "SIMCONNECT_EXCEPTION_INVALID_ARRAY";
		case SIMCONNECT_EXCEPTION_CREATE_OBJECT_FAILED:
			return "SIMCONNECT_EXCEPTION_CREATE_OBJECT_FAILED";
		case SIMCONNECT_EXCEPTION_LOAD_FLIGHTPLAN_FAILED:
			return "SIMCONNECT_EXCEPTION_LOAD_FLIGHTPLAN_FAILED";
		case SIMCONNECT_EXCEPTION_OPERATION_INVALID_FOR_OBJECT_TYPE:
			return "SIMCONNECT_EXCEPTION_OPERATION_INVALID_FOR_OBJECT_TYPE";
		case SIMCONNECT_EXCEPTION_ILLEGAL_OPERATION:
			return "SIMCONNECT_EXCEPTION_ILLEGAL_OPERATION";
		case SIMCONNECT_EXCEPTION_ALREADY_SUBSCRIBED:
			return "SIMCONNECT_EXCEPTION_ALREADY_SUBSCRIBED";
		case SIMCONNECT_EXCEPTION_INVALID_ENUM:
			return "SIMCONNECT_EXCEPTION_INVALID_ENUM";
		case SIMCONNECT_EXCEPTION_DEFINITION_ERROR:
			return "SIMCONNECT_EXCEPTION_DEFINITION_ERROR";
		case SIMCONNECT_EXCEPTION_DUPLICATE_ID:
			return "SIMCONNECT_EXCEPTION_DUPLICATE_ID";
		case SIMCONNECT_EXCEPTION_DATUM_ID:
			return "SIMCONNECT_EXCEPTION_DATUM_ID";
		case SIMCONNECT_EXCEPTION_OUT_OF_BOUNDS:
			return "SIMCONNECT_EXCEPTION_OUT_OF_BOUNDS";
		case SIMCONNECT_EXCEPTION_ALREADY_CREATED:
			return "SIMCONNECT_EXCEPTION_ALREADY_CREATED";
		case SIMCONNECT_EXCEPTION_OBJECT_OUTSIDE_REALITY_BUBBLE:
			return "SIMCONNECT_EXCEPTION_OBJECT_OUTSIDE_REALITY_BUBBLE";
		case SIMCONNECT_EXCEPTION_OBJECT_CONTAINER:
			return "SIMCONNECT_EXCEPTION_OBJECT_CONTAINER";
		case SIMCONNECT_EXCEPTION_OBJECT_AI:
			return "SIMCONNECT_EXCEPTION_OBJECT_AI";
		case SIMCONNECT_EXCEPTION_OBJECT_ATC:
			return "SIMCONNECT_EXCEPTION_OBJECT_ATC";
		case SIMCONNECT_EXCEPTION_OBJECT_SCHEDULE:
			return "SIMCONNECT_EXCEPTION_OBJECT_SCHEDULE";
		case SIMCONNECT_EXCEPTION_JETWAY_DATA:
			return "SIMCONNECT_EXCEPTION_JETWAY_DATA";
		case SIMCONNECT_EXCEPTION_ACTION_NOT_FOUND:
			return "SIMCONNECT_EXCEPTION_ACTION_NOT_FOUND";
		case SIMCONNECT_EXCEPTION_NOT_AN_ACTION:
			return "SIMCONNECT_EXCEPTION_NOT_AN_ACTION";
		case SIMCONNECT_EXCEPTION_INCORRECT_ACTION_PARAMS:
			return "SIMCONNECT_EXCEPTION_INCORRECT_ACTION_PARAMS";
		case SIMCONNECT_EXCEPTION_GET_INPUT_EVENT_FAILED:
			return "SIMCONNECT_EXCEPTION_GET_INPUT_EVENT_FAILED";
		case SIMCONNECT_EXCEPTION_SET_INPUT_EVENT_FAILED:
			return "SIMCONNECT_EXCEPTION_SET_INPUT_EVENT_FAILED";
		default:
			return "Unknown SimConnect Error";
	}
}

static SIMCONNECT_DATATYPE VarTypeToDataType(DataModel::VarType type)
{
	using VarType = DataModel::VarType;

	switch (type)
	{
		case VarType::INVALID:
			return SIMCONNECT_DATATYPE_INVALID;
		case VarType::INT32:
			return SIMCONNECT_DATATYPE_INT32;
		case VarType::INT64:
			return SIMCONNECT_DATATYPE_INT64;
		case VarType::FLOAT32:
			return SIMCONNECT_DATATYPE_FLOAT32;
		case VarType::FLOAT64:
			return SIMCONNECT_DATATYPE_FLOAT64;
		case VarType::STRING8:
			return SIMCONNECT_DATATYPE_STRING8;
		case VarType::STRING32:
			return SIMCONNECT_DATATYPE_STRING32;
		case VarType::STRING64:
			return SIMCONNECT_DATATYPE_STRING64;
		case VarType::STRING128:
			return SIMCONNECT_DATATYPE_STRING128;
		case VarType::STRING256:
			return SIMCONNECT_DATATYPE_STRING256;
		case VarType::STRING260:
			return SIMCONNECT_DATATYPE_STRING260;
		case VarType::STRINGV:
			return SIMCONNECT_DATATYPE_STRINGV;
		case VarType::INITPOSITION:
			return SIMCONNECT_DATATYPE_INITPOSITION;
		case VarType::MARKERSTATE:
			return SIMCONNECT_DATATYPE_MARKERSTATE;
		case VarType::WAYPOINT:
			return SIMCONNECT_DATATYPE_WAYPOINT;
		case VarType::LATLONALT:
			return SIMCONNECT_DATATYPE_LATLONALT;
		case VarType::XYZ:
			return SIMCONNECT_DATATYPE_XYZ;
		default:
			throw std::exception("Unknown VarType value");
	}
}

static const char* StringifyVarType(DataModel::VarType type)
{
	using VarType = DataModel::VarType;

	switch (type)
	{
		case VarType::INVALID:
			return "INVALID";
		case VarType::INT32:
			return "INT32";
		case VarType::INT64:
			return "INT64";
		case VarType::FLOAT32:
			return "FLOAT32";
		case VarType::FLOAT64:
			return "FLOAT64";
		case VarType::STRING8:
			return "STRING8";
		case VarType::STRING32:
			return "STRING32";
		case VarType::STRING64:
			return "STRING64";
		case VarType::STRING128:
			return "STRING128";
		case VarType::STRING256:
			return "STRING256";
		case VarType::STRING260:
			return "STRING260";
		case VarType::STRINGV:
			return "STRINGV";
		case VarType::INITPOSITION:
			return "INITPOSITION";
		case VarType::MARKERSTATE:
			return "MARKERSTATE";
		case VarType::WAYPOINT:
			return "WAYPOINT";
		case VarType::LATLONALT:
			return "LATLONALT";
		case VarType::XYZ:
			return "XYZ";
		default:
			throw std::exception("Unknown VarType value");
	}
}

static SIMCONNECT_PERIOD RequestPeriodToNative(RequestPeriod period)
{
	switch (period)
	{
		case RequestPeriod::NEVER:
			return SIMCONNECT_PERIOD_NEVER;
		case RequestPeriod::ONCE:
			return SIMCONNECT_PERIOD_ONCE;
		case RequestPeriod::VISUAL_FRAME:
			return SIMCONNECT_PERIOD_VISUAL_FRAME;
		case RequestPeriod::SIM_FRAME:
			return SIMCONNECT_PERIOD_SIM_FRAME;
		case RequestPeriod::SECOND:
			return SIMCONNECT_PERIOD_SECOND;
		default:
			throw std::exception("Unknown RequestPeriod value");
	}
}

static bool IsRepeatable(RequestPeriod period)
{
	using enum RequestPeriod;

	switch (period)
	{
		case NEVER:
		case ONCE:
			return false;
		case VISUAL_FRAME:
		case SIM_FRAME:
		case SECOND:
			return true;
		default:
			throw std::exception("Unknown RequestPeriod value");
	}
}

static const char* StringifyRequestPeriod(RequestPeriod period)
{
	switch (period)
	{
		case RequestPeriod::NEVER:
			return "NEVER";
		case RequestPeriod::ONCE:
			return "ONCE";
		case RequestPeriod::VISUAL_FRAME:
			return "VISUAL_FRAME";
		case RequestPeriod::SIM_FRAME:
			return "SIM_FRAME";
		case RequestPeriod::SECOND:
			return "SECOND";
		default:
			throw std::exception("Unknown RequestPeriod value");
	}
}

static ObjectType NativeToObjectType(SIMCONNECT_SIMOBJECT_TYPE type)
{
	switch (type)
	{
		case SIMCONNECT_SIMOBJECT_TYPE_USER:
			return ObjectType::USER;
		case SIMCONNECT_SIMOBJECT_TYPE_ALL:
			return ObjectType::ALL;
		case SIMCONNECT_SIMOBJECT_TYPE_AIRCRAFT:
			return ObjectType::AIRCRAFT;
		case SIMCONNECT_SIMOBJECT_TYPE_HELICOPTER:
			return ObjectType::HELICOPTER;
		case SIMCONNECT_SIMOBJECT_TYPE_BOAT:
			return ObjectType::BOAT;
		case SIMCONNECT_SIMOBJECT_TYPE_GROUND:
			return ObjectType::GROUND;
		default:
			throw std::exception("Unknown SIMOBJECT_TYPE value");
	}
}

static SIMCONNECT_SIMOBJECT_TYPE ObjectTypeToNative(ObjectType type)
{
	switch (type)
	{
		case ObjectType::USER:
			return SIMCONNECT_SIMOBJECT_TYPE_USER;
		case ObjectType::ALL:
			return SIMCONNECT_SIMOBJECT_TYPE_ALL;
		case ObjectType::AIRCRAFT:
			return SIMCONNECT_SIMOBJECT_TYPE_AIRCRAFT;
		case ObjectType::HELICOPTER:
			return SIMCONNECT_SIMOBJECT_TYPE_HELICOPTER;
		case ObjectType::BOAT:
			return SIMCONNECT_SIMOBJECT_TYPE_BOAT;
		case ObjectType::GROUND:
			return SIMCONNECT_SIMOBJECT_TYPE_GROUND;
		default:
			throw std::exception("Unknown ObjectType value");
	}
}

static const char* StringifyObjectType(ObjectType type)
{
	switch (type)
	{
		case ObjectType::USER:
			return "USER";
		case ObjectType::ALL:
			return "ALL";
		case ObjectType::AIRCRAFT:
			return "AIRCRAFT";
		case ObjectType::HELICOPTER:
			return "HELICOPTER";
		case ObjectType::BOAT:
			return "BOAT";
		case ObjectType::GROUND:
			return "GROUND";
		default:
			throw std::exception("Unknown ObjectType value");
	}
}

unsigned int Client::LogLastPacket(const std::string_view& name)
{
	DWORD id = 0;
	auto hr = SimConnect_GetLastSentPacketID(hSimConnect, &id);
	if (SUCCEEDED(hr))
		Logger::LogDebug("SimConnect::Client: Last Packet ID: {} - {}", id, name);
	return id;
}

bool Client::RegisterDataModel(DataModel& model)
{
	if (nextModelId == ~0)
		nextModelId = 1;
	auto id = nextModelId++;
	
	const DataModel::VarDef* array;
	unsigned int count;
	model.GetModel(&array, &count);

	for (unsigned int i = 0; i < count; ++i)
	{
		auto& var = array[i];

		auto hr = SimConnect_AddToDataDefinition(hSimConnect, id, var.name, var.unit, VarTypeToDataType(var.type));
		LogLastPacket("SimConnect_AddToDataDefinition");
		if (FAILED(hr))
		{
			Logger::LogError("SimConnect::Client: Failed to add var {} to model {}", var.name, model.GetName());
			Logger::LogDebug("Var: {} {} {}", var.name, var.unit, StringifyVarType(var.type));
			SimConnect_ClearDataDefinition(hSimConnect, id);
			model.modelId = 0;
			return false;
		}
	}
	model.modelId = id;
	return true;
}

void Client::SubscribeToObjectAdded(const std::function<void(EventObject event)>& callback)
{
	auto hr = SimConnect_SubscribeToSystemEvent(hSimConnect, (DWORD)SystemEvents::ObjectAdded, "ObjectAdded");
	LogLastPacket("SimConnect_SubscribeToSystemEvent(ObjectAdded)");
	if (FAILED(hr))
		Logger::LogError("Failed to subscribe to system event ObjectAdded");
	else
		eventObjectAdded = callback;
}

void Client::SubscribeToObjectRemoved(const std::function<void(EventObject event)>& callback)
{
	auto hr = SimConnect_SubscribeToSystemEvent(hSimConnect, (DWORD)SystemEvents::ObjectRemoved, "ObjectRemoved");
	LogLastPacket("SimConnect_SubscribeToSystemEvent(ObjectRemoved)");
	if (FAILED(hr))
		Logger::LogError("Failed to subscribe to system event ObjectRemoved");
	else
		eventObjectRemoved = callback;
}

void Client::SubscribeToSimStart(const std::function<void()>& callback)
{
	auto hr = SimConnect_SubscribeToSystemEvent(hSimConnect, (DWORD)SystemEvents::SimStart, "SimStart");
	LogLastPacket("SimConnect_SubscribeToSystemEvent(SimStart)");
	if (FAILED(hr))
		Logger::LogError("Failed to subscribe to system event SimStart");
	else
		eventSimStart = callback;
}

void Client::SubscribeToSimStop(const std::function<void()> callback)
{
	auto hr = SimConnect_SubscribeToSystemEvent(hSimConnect, (DWORD)SystemEvents::SimStop, "SimStop");
	LogLastPacket("SimConnect_SubscribeToSystemEvent(SimStop)");
	if (FAILED(hr))
		Logger::LogError("Failed to subscribe to system event SimStop");
	else
		eventSimStop = callback;
}

void Client::SubscribeToPause(const std::function<void(bool paused)>& callback)
{
	auto hr = SimConnect_SubscribeToSystemEvent(hSimConnect, (DWORD)SystemEvents::Pause, "Pause");
	LogLastPacket("SimConnect_SubscribeToSystemEvent(Pause)");
	if (FAILED(hr))
		Logger::LogError("Failed to subscribe to system event Pause");
	else
		eventPause = callback;
}

RequestId Client::RequestDataOnSimObject(ObjectId objectId, const DataModel& model, const std::function<void(void* data, ObjectId objId)>& callback, RequestPeriod period)
{
	if (nextRequestId == ~0)
		nextRequestId = 1;
	auto requestId = nextRequestId++;

	auto hr = SimConnect_RequestDataOnSimObject(hSimConnect, requestId, model.modelId, objectId, RequestPeriodToNative(period));
	auto packetId = LogLastPacket("SimConnect_RequestDataOnSimObject");
	if (FAILED(hr))
	{
		Logger::LogError("SimConnect::Client: Failed to request data on object {}", objectId);
		Logger::LogDebug("Args: {} [{}] {} {} [{}]", model.GetName(), model.modelId, objectId, StringifyRequestPeriod(period), (unsigned int)period);
		return 0;
	}
	else
	{
		RequestInfo event
		{
			requestId,
			objectId,
			model.modelId,
			IsRepeatable(period),
			callback,
			CreateTimeStamp(),
			packetId,
		};
		requests.emplace_back(std::move(event));
		return requestId;
	}
}

void Client::CancelDataOnSimObject(RequestId requestId)
{
	for (auto i = requests.begin(); i != requests.end(); ++i)
	{
		auto& request = *i;

		if (request.requestId == requestId)
		{
			CancelDataOnSimObject(request.objectId, request.modelId, request.requestId);
			requests.erase(i);
			return;
		}
	}
}

void Client::CancelDataOnSimObject(ObjectId objectId, ModelId modelId, RequestId requestId)
{
	auto hr = SimConnect_RequestDataOnSimObject(hSimConnect, requestId, modelId, objectId, RequestPeriodToNative(RequestPeriod::NEVER));
	auto packetId = LogLastPacket("SimConnect_RequestDataOnSimObject(RequestPeriod::NEVER)");
	if (FAILED(hr))
	{
		Logger::LogError("SimConnect::Client: Failed to cancel request data on object {}", objectId);
		Logger::LogDebug("Args: {} {} {} {} [{}]", objectId, modelId, objectId, StringifyRequestPeriod(RequestPeriod::NEVER), (unsigned int)RequestPeriod::NEVER);
	}
}

RequestId Client::RequestDataOnSimObjectType(ObjectType type, const DataModel& model, const std::function<void(void* data, ObjectId objId)>& callback, unsigned int radius)
{
	if (nextRequestId == ~0)
		nextRequestId = 1;
	auto requestId = nextRequestId++;

	auto hr = SimConnect_RequestDataOnSimObjectType(hSimConnect, requestId, model.modelId, radius, ObjectTypeToNative(type));
	auto packetId = LogLastPacket("SimConnect_RequestDataOnSimObjectType");
	if (FAILED(hr))
	{
		Logger::LogError("SimConnect::Client: Failed to request data on object type {}", StringifyObjectType(type));
		Logger::LogDebug("Args: {} [{}] {} [{}] {}", model.GetName(), model.modelId, StringifyObjectType(type), (unsigned int)type, radius);
		return 0;
	}
	else
	{
		RequestInfo event
		{
			requestId,
			0,
			model.modelId,
			false,
			callback,
			CreateTimeStamp(),
			packetId,
		};
		requests.emplace_back(std::move(event));
		return requestId;
	}
}

EventId Client::MapEvent(const char* event, const std::function<void(unsigned int data[5])>& callback)
{
	if (nextEventId == ~0)
		return 0;
	auto id = nextEventId++;

	auto hr = SimConnect_MapClientEventToSimEvent(hSimConnect, id, event);
	LogLastPacket("SimConnect_MapClientEventToSimEvent()");
	if (FAILED(hr))
	{
		Logger::LogError("Failed to map event {}", event);
		return 0;
	}
	else
	{
		EventInfo event
		{
			id,
			callback,
		};
		events.emplace_back(std::move(event));
		return id;
	}
}

void Client::AddEventToGroup(EventId evid, GroupId gid)
{
	auto hr = SimConnect_AddClientEventToNotificationGroup(hSimConnect, gid, evid);
	LogLastPacket("SimConnect_AddClientEventToNotificationGroup()");
	if (FAILED(hr))
		Logger::LogError("Failed to add event {} to {}", evid, gid);
}

void Client::TransmitEvent(EventId evid, unsigned int value)
{
	auto hr = SimConnect_TransmitClientEvent(hSimConnect, 0, evid, value, SIMCONNECT_GROUP_PRIORITY_HIGHEST, SIMCONNECT_EVENT_FLAG_GROUPID_IS_PRIORITY);
	LogLastPacket("SimConnect_TransmitClientEvent()");
	if (FAILED(hr))
		Logger::LogError("Failed to transmit event {}", evid);
}

void Client::TransmitEventEx(ObjectId objectId, EventId evid, unsigned int value, unsigned int value1, unsigned int value2, unsigned int value3, unsigned int value4)
{
	SimConnect_TransmitClientEvent_EX1(hSimConnect, objectId, evid, SIMCONNECT_GROUP_PRIORITY_HIGHEST, SIMCONNECT_EVENT_FLAG_GROUPID_IS_PRIORITY, value, value1, value2, value3, value4);
	auto hr = LogLastPacket("SimConnect_TransmitClientEvent_EX1()");
	if (FAILED(hr))
		Logger::LogError("Failed to transmit event {}", evid);
}
