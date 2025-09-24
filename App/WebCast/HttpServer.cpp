#include "HttpServer.hpp"
#define WINVER 0x0A00
#define _WIN32_WINNT 0x0A00
#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include "HttpMessage.hpp"

namespace http = boost::beast::http;

HttpServer::HttpServer()
{
}

HttpServer::~HttpServer()
{
}

boost::asio::awaitable<void> HttpServer::Run(boost::asio::ip::tcp::endpoint endpoint)
{
	auto ctx = co_await boost::asio::this_coro::executor;
	boost::asio::ip::tcp::acceptor acceptor{ ctx, endpoint };
	boost::beast::error_code ec;

	while (true)
	{
		boost::asio::ip::tcp::socket socket = co_await acceptor.async_accept(ctx, boost::asio::redirect_error(ec));
		if (ec)
			continue;

		HttpConnection connection{ std::move(socket) };
		boost::asio::co_spawn(ctx, RunConnection(std::move(connection)), boost::asio::detached);
	}
}

boost::asio::awaitable<void> HttpServer::RunConnection(HttpConnection connection)
{
	do
	{
		co_await connection.Read();

		auto method = connection.request.method();
		bool allowed = false;
		switch (method)
		{
			case http::verb::delete_:
			case http::verb::get:
			case http::verb::head:
			case http::verb::patch:
			case http::verb::post:
			case http::verb::put:
				allowed = true;
				break;
		}

		if (!allowed)
		{
			co_await RespondBadRequest(connection);
			continue;
		}

		if (connection.upgradable)
		{
			if (http::token_list{ connection.request[http::field::connection] }.exists("upgrade"))
			{
				bool hasUpgraded = co_await onUpgrade(connection);
				if (!hasUpgraded)
				{
					co_await RespondBadRequest(connection);
					connection.socket.shutdown(boost::asio::ip::tcp::socket::shutdown_send);
				}
				co_return;
			}
			connection.upgradable = false;
		}
		
		auto target = connection.request.target();
		if (target.empty() || target[0] != '/' || target.find("..") != target.npos)
		{
			co_await RespondBadRequest(connection);
			co_return;
		}

		co_await onRequest(connection);
		if (!connection.request.keep_alive())
			break;

		connection.buffer.consume(connection.buffer.size());
		connection.request.clear();
	} while (true);

	connection.socket.shutdown(boost::asio::ip::tcp::socket::shutdown_send);
}

static http::response<http::string_body> CreateDocumentResponse(http::request<http::string_body>& request, http::status status)
{
	auto response = HttpMessage::Create<http::string_body>(request, status);
	response.set(http::field::content_type, "text/html");
	return response;
}

boost::asio::awaitable<void> HttpServer::RespondBadRequest(HttpConnection& connection)
{
	auto response = CreateDocumentResponse(connection.request, http::status::bad_request);
	response.body() = "400 Bad Request";
	response.prepare_payload();

	co_await connection.Write(std::move(response));
}

boost::asio::awaitable<void> HttpServer::RespondNotFound(HttpConnection& connection)
{
	auto response = CreateDocumentResponse(connection.request, http::status::not_found);
	response.body() = "404 Not Found";
	response.prepare_payload();
	
	co_await connection.Write(std::move(response));
}

boost::asio::awaitable<void> HttpServer::RespondInternalError(HttpConnection& connection)
{
	auto response = CreateDocumentResponse(connection.request, http::status::internal_server_error);
	response.body() = "500 Internal Server Error";
	response.prepare_payload();
	
	co_await connection.Write(std::move(response));
}
