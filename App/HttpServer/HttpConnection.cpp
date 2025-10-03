#include "HttpConnection.hpp"
#include <boost/asio.hpp>
#include <boost/beast/http.hpp>

namespace http = boost::beast::http;

HttpConnection::HttpConnection(boost::asio::ip::tcp::socket&& socket) : socket(std::move(socket)), upgradable(true)
{
}

boost::asio::awaitable<void> HttpConnection::Read()
{
	co_await http::async_read(this->socket, buffer, request);
}

boost::asio::awaitable<void> HttpConnection::Write(http::message_generator msg)
{
	co_await boost::beast::async_write(this->socket, std::move(msg));
}
