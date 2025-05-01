#pragma once
#include <functional>
#include <string_view>

namespace SimConnect
{
	typedef unsigned int ObjectId;
	typedef unsigned int ModelId;
	typedef unsigned int RequestId;
	typedef unsigned int EventId;
	typedef unsigned int GroupId;

	static constexpr ObjectId ObjectIdUser = 0;
	static constexpr GroupId DefaultGroup = 0;

	enum class RequestPeriod
	{
		NEVER,
		ONCE,
		VISUAL_FRAME,
		SIM_FRAME,
		SECOND,
	};

	enum class ObjectType
	{
		USER,
		ALL,
		AIRCRAFT,
		HELICOPTER,
		BOAT,
		GROUND,
	};

	struct EventServer
	{
		const char* appName;
		unsigned int appVersionMajor;
		unsigned int appVersionMinor;
		unsigned int serverVersionMajor;
		unsigned int serverVersionMinor;
	};

	struct EventException
	{
		unsigned int exception;
		unsigned int argId;
		const char* exceptionName;
	};

	struct EventObject
	{
		ObjectType type;
		ObjectId objectId;
	};

	struct EventInputDef
	{
		const char* name;
		unsigned __int64 hash;
	};

	struct ObjectData
	{

	};

	struct DataModel
	{
		enum class VarType
		{
			INVALID,
			INT32,
			INT64,
			FLOAT32,
			FLOAT64,
			STRING8,
			STRING32,
			STRING64,
			STRING128,
			STRING256,
			STRING260,
			STRINGV,

			INITPOSITION,
			MARKERSTATE,
			WAYPOINT,
			LATLONALT,
			XYZ,
		};

		struct VarDef
		{
			VarType type;
			const char* name;
			const char* unit;
		};

		ModelId modelId = 0;
		virtual void GetModel(const VarDef** pArray, unsigned int* count) const = 0;
		virtual const char* GetName() const = 0;
	};

	class Client
	{
	private:
		struct RequestInfo
		{
			RequestId requestId;
			ObjectId objectId;
			ModelId modelId;

			bool repeatable;
			std::function<void(void* data, ObjectId objId)> callback;
			long long timeStamp;
			unsigned int packetId;
		};
		struct EventInfo
		{
			EventId eventId;
			std::function<void(unsigned int data[5])> callback;
		};

		void* hSimConnect;
		ModelId nextModelId;
		RequestId nextRequestId;
		EventId nextEventId;

		std::function<void(const EventServer& event)> eventConnect;
		std::function<void()> eventDisconnect;
		std::function<void(const EventException& event)> eventException;
		std::function<void(EventObject event)> eventObjectAdded; //see if optimizer screws up when passing const ref
		std::function<void(EventObject event)> eventObjectRemoved;
		std::function<void()> eventSimStart;
		std::function<void()> eventSimStop;
		std::function<void(bool paused)> eventPause;
		std::vector<RequestInfo> requests;
		std::vector<EventInfo> events;

		unsigned int LogLastPacket(const std::string_view& name);
		void CancelDataOnSimObject(ObjectId objectId, ModelId modelId, RequestId requestId);

	public:
		Client();
		~Client();

		bool Initialize(const char* name);
		void Shutdown();

		bool RunCallbacks();
		void SetConnectCallback(const std::function<void(const EventServer& event)>& callback);
		void SetDisconnectCallback(const std::function<void()>& callback);
		void SetExceptionCallback(const std::function<void(const EventException& event)>& callback);

		void SubscribeToObjectAdded(const std::function<void(EventObject event)>& callback);
		void SubscribeToObjectRemoved(const std::function<void(EventObject event)>& callback);
		void SubscribeToSimStart(const std::function<void()>& callback);
		void SubscribeToSimStop(const std::function<void()> callback);
		void SubscribeToPause(const std::function<void(bool paused)>& callback);

		bool RegisterDataModel(DataModel& model);
		RequestId RequestDataOnSimObject(ObjectId objectId, const DataModel& model, const std::function<void(void* data, ObjectId objId)>& callback, RequestPeriod period = RequestPeriod::ONCE);
		void CancelDataOnSimObject(RequestId requestId);
		RequestId RequestDataOnSimObjectType(ObjectType type, const DataModel& model, const std::function<void(void* data, ObjectId objId)>& callback, unsigned int radius);

		EventId MapEvent(const char* event, const std::function<void(unsigned int data[5])>& callback);
		void AddEventToGroup(EventId evid, GroupId gid);
		void TransmitEvent(EventId evid, unsigned int value);
		void TransmitEventEx(ObjectId objectId, EventId evid, unsigned int value, unsigned int value1 = 0, unsigned int value2 = 0, unsigned int value3 = 0, unsigned int value4 = 0);

		bool IsConnected() { return hSimConnect != nullptr; }
	};
}
