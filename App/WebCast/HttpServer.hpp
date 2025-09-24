#pragma once
#include <vector>
#include <functional>
#define WINVER 0x0A00
#define _WIN32_WINNT 0x0A00
#include <boost/asio/awaitable.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core/flat_buffer.hpp>
#include "HttpConnection.hpp"

class HttpServer
{
public:
	HttpServer();
	~HttpServer();

	boost::asio::awaitable<void> Run(boost::asio::ip::tcp::endpoint endpoint);

	boost::asio::awaitable<void> RespondBadRequest(HttpConnection& connection);
	boost::asio::awaitable<void> RespondNotFound(HttpConnection& connection);
	boost::asio::awaitable<void> RespondInternalError(HttpConnection& connection);
	
	std::function<boost::asio::awaitable<bool>(HttpConnection& connection)> onUpgrade;
	std::function<boost::asio::awaitable<void>(HttpConnection& connection)> onRequest;

private:
	boost::asio::awaitable<void> RunConnection(HttpConnection connection);
};
