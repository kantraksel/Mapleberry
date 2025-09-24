#pragma once
#include "WebSocket.hpp"
#include "HttpConnection.hpp"

namespace http = boost::beast::http;

class WebSocketServer
{
public:
	WebSocketServer();
	~WebSocketServer();

	void Shutdown();
	boost::asio::awaitable<void> Run();
	boost::asio::awaitable<void> Accept(HttpConnection connection);

	std::function<void(WebSocket& ws)> onOpen;

	//private:
	std::list<WebSocket> wss;

public:
	bool IsUpgrade(http::request<http::string_body>& request)
	{
		return boost::beast::websocket::is_upgrade(request);
	}
};
