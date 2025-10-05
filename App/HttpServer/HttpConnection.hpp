#pragma once
#include "Utils/Boost.h"
#include <boost/asio/awaitable.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core/flat_buffer.hpp>
#include <boost/beast/http/message.hpp>
#include <boost/beast/http/message_generator.hpp>
#include <boost/beast/http/string_body.hpp>

struct HttpConnection
{
	boost::asio::ip::tcp::socket socket;
	boost::beast::flat_buffer buffer;
	boost::beast::http::request<boost::beast::http::string_body> request;
	bool upgradable;

	HttpConnection(boost::asio::ip::tcp::socket&& socket);

	boost::asio::awaitable<void> Read();
	boost::asio::awaitable<void> Write(boost::beast::http::message_generator msg);
};
