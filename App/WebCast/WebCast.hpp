#pragma once
#include <thread>
#include <map>
#include "Utils/Boost.h"
#include <boost/asio.hpp>
#include "HttpServer.hpp"
#include "WebSocketServer.hpp"
#include "Utils/FixedArray.h"

enum class MsgId : uint8_t
{
	SendAllData = 1,
	ModifySystemState = 2,
	ModifySystemProperties = 3,
	RadarAddAircraft = 4,
	RadarRemoveAircraft = 5,
	RadarUpdateAircraft = 6,
	LocalAddAircraft = 7,
	LocalRemoveAircraft = 8,
	LocalUpdateAircraft = 9,
};

class WebCast
{
public:
	WebCast();
	~WebCast();

	void Start();
	void Stop();
	void Wait();

	typedef std::function<void(const FixedArrayCharS& buffer)> Callback;

	void RegisterHandler(MsgId id, const Callback& callback);
	void Send(MsgId id, const FixedArrayCharS& buffer);

private:
	boost::asio::awaitable<void> ProcessRequest(HttpConnection& connection);
	boost::asio::awaitable<bool> ProcessGetFile(HttpConnection& connection);
	void OnWebsocketOpen(WebSocket& ws);
	
	boost::asio::io_context ctx;
	std::jthread worker;
	HttpServer server;
	WebSocketServer wss;
	std::map<MsgId, Callback> callbacks;
};
