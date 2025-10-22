#include <filesystem>
#include "WebCast.hpp"
#include "HttpServer/HttpMessage.hpp"
#include "MsgPacker.hpp"
#include "App/RealTimeThread.h"
#include "Utils/Logger.h"

extern RealTimeThread thread;

WebCast::WebCast()
{
}

WebCast::~WebCast()
{
}

void WebCast::Start()
{
	auto address = boost::asio::ip::make_address("127.0.0.1");
	unsigned short port = std::atoi("5170");
	auto endpoint = boost::asio::ip::tcp::endpoint{ address, port };
	Logger::Log("Running http/wss server on {}:{}", endpoint.address().to_string(), endpoint.port());

	using namespace std::placeholders;
	server.onRequest = std::bind(&WebCast::ProcessRequest, this, _1);
	server.onUpgrade = [&](HttpConnection& connection) -> boost::asio::awaitable<bool>
		{
			if (wss.IsUpgrade(connection.request))
			{
				co_await wss.Accept(std::move(connection));
				co_return true;
			}
			co_return false;
		};

	wss.onOpen = std::bind(&WebCast::OnWebsocketOpen, this, _1);

	thread.Dispatch(wss.Run());
	thread.Dispatch(server.Run(std::move(endpoint)));
}

static void LogHttpResponse(const HttpConnection& connection, int status)
{
	auto verb = http::to_string(connection.request.method());
	auto target = connection.request.target();
	auto ep = connection.socket.remote_endpoint();
	auto address = ep.address().to_string();
	Logger::Log("HTTP {} {} {} - {}", verb, target, status, address);
}

boost::asio::awaitable<void> WebCast::ProcessRequest(HttpConnection& connection)
{
	if (co_await ProcessGetFile(connection))
		co_return;
	LogHttpResponse(connection, 404);
	co_await server.RespondNotFound(connection);
}

boost::asio::awaitable<bool> WebCast::ProcessGetFile(HttpConnection& connection)
{
	auto method = connection.request.method();
	if (method != http::verb::get && method != http::verb::head)
	{
		LogHttpResponse(connection, 400);
		co_await server.RespondBadRequest(connection);
		co_return true;
	}

	auto target = connection.request.target();
	std::filesystem::path path = std::string_view(target.data(), target.size());
	path = std::filesystem::current_path() / "html" / path.relative_path();
	if (target.back() == '/')
		path /= "index.html";

	boost::beast::error_code ec;
	http::file_body::value_type file;
	file.open(path.string().data(), boost::beast::file_mode::scan, ec);
	if (ec)
	{
		if (ec == boost::system::errc::no_such_file_or_directory)
			co_return false;
		LogHttpResponse(connection, 500);
		co_await server.RespondInternalError(connection);
		co_return true;
	}

	LogHttpResponse(connection, 200);
	if (method == http::verb::head)
	{
		auto response = HttpMessage::Create<http::empty_body>(connection.request, http::status::ok);

		//response.set(http::field::content_type, "application/octet-stream");
		response.content_length(file.size());
		co_await connection.Write(std::move(response));
	}
	else
	{
		auto size = file.size();
		http::response<http::file_body> response{
			std::piecewise_construct,
			std::make_tuple(std::move(file)),
			std::make_tuple(http::status::ok, connection.request.version()),
		};
		HttpMessage::Setup(response, connection.request);

		//response.set(http::field::content_type, "application/octet-stream");
		response.content_length(size);
		co_await connection.Write(std::move(response));
	}

	co_return true;
}

void WebCast::OnWebsocketOpen(WebSocket& ws)
{
	auto ep = ws.GetEndpoint();
	Logger::Log("WSS: {}:{} connected", ep.address().to_string(), ep.port());

	ws.onReceive = [this](auto& ws, const auto& message)
		{
			if (message.isText)
				return;
			auto buffer = message.Binary();

			size_t offset = 0;
			auto handle = msgpack::unpack(buffer, buffer.size(), offset);
			auto& obj = handle.get();
			if (obj.type != msgpack::type::POSITIVE_INTEGER)
				return;

			auto type = obj.as<uint8_t>();

			auto i = callbacks.find(static_cast<MsgId>(type));
			if (i == callbacks.end())
			{
				auto ep = ws.GetEndpoint();
				Logger::LogWarn("WSS: Message {} has been discarded", type);
				return;
			}

			if (offset >= buffer.size())
				i->second({});
			else
				i->second(FixedArrayCharS::CreateArrayRef(buffer + offset, buffer.size() - offset));
		};
	ws.onClose = [](auto& ws)
		{
			auto& ep = ws.GetEndpoint();
			Logger::Log("WSS: {}:{} disconnected", ep.address().to_string(), ep.port());
		};
}

void WebCast::RegisterHandler(MsgId id, const Callback& callback)
{
	callbacks[id] = callback;
}

void WebCast::Send(MsgId id, const FixedArrayCharS& buffer)
{
	if (wss.wss.empty())
		return;

	MsgPacker packer;
	packer.pack(static_cast<uint8_t>(id));
	if (!buffer.empty())
		packer.write_raw(buffer);
	auto data = packer.view();

	for (auto i = wss.wss.begin(); i != wss.wss.end(); ++i)
	{
		i->Send(data);
	}
}
