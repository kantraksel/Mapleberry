#include "WebSocketServer.hpp"
#include "Utils/Boost.h"
#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/websocket.hpp>
#include "version.hpp"

WebSocketServer::WebSocketServer()
{
}

WebSocketServer::~WebSocketServer()
{
}

void WebSocketServer::Shutdown()
{
	wss.clear();
}

boost::asio::awaitable<void> WebSocketServer::Run()
{
	using namespace std::chrono_literals;
	auto ctx = co_await boost::asio::this_coro::executor;

	std::vector<std::list<WebSocket>::iterator> oldSockets;
	boost::asio::steady_timer timer(ctx, 40ms);
	while (true)
	{
		co_await timer.async_wait();
		timer.expires_after(40ms);

		for (auto i = wss.begin(); i != wss.end(); ++i)
		{
			if (!i->IsRunning())
				oldSockets.push_back(i);
		}

		for (auto& i : oldSockets)
		{
			wss.erase(i);
		}
		oldSockets.clear();
	}
}

boost::asio::awaitable<void> WebSocketServer::Accept(HttpConnection connection)
{
	boost::beast::websocket::stream<boost::beast::tcp_stream> ws{ std::move(connection.socket) };
	ws.set_option(boost::beast::websocket::stream_base::timeout::suggested(boost::beast::role_type::server));
	ws.set_option(boost::beast::websocket::stream_base::decorator([](boost::beast::websocket::response_type& response)
																  {
																	  response.set(http::field::server, TEAPOT_VERSION);
																  }));

	boost::beast::error_code ec;
	co_await ws.async_accept(connection.request, boost::asio::redirect_error(ec));
	if (ec)
		co_return;

	auto& object = wss.emplace_back(std::move(ws), std::move(connection.buffer));
	if (onOpen)
		onOpen(object);
	object.RunAsync();
}
