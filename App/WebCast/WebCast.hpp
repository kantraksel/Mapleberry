#pragma once
#include <thread>
#include <boost/asio.hpp>
#include "HttpServer.hpp"
#include "WebSocketServer.hpp"

class WebCast
{
public:
	WebCast();
	~WebCast();

	void Start();
	void Stop();
	void Wait();

private:
	boost::asio::awaitable<void> ProcessRequest(HttpConnection& connection);
	boost::asio::awaitable<bool> ProcessGetFile(HttpConnection& connection);
	void OnWebsocketOpen(WebSocket& ws);
	
	boost::asio::io_context ctx;
	std::jthread worker;
	HttpServer server;
	WebSocketServer wss;
};
