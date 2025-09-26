#include <filesystem>
#include "WebCast.hpp"
#include "HttpMessage.hpp"
#include "MsgPacker.hpp"
#include "Utils/Logger.h"

WebCast::WebCast()
{
}

WebCast::~WebCast()
{
}

void WebCast::Start()
{
	auto address = boost::asio::ip::make_address("127.0.0.1");
	unsigned short port = std::atoi("7777");
	auto endpoint = boost::asio::ip::tcp::endpoint{ address, port };

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

	boost::asio::signal_set signals(ctx, SIGINT, SIGTERM);
	signals.async_wait([&](auto, auto)
					   {
						   ctx.stop();
					   });

	boost::asio::co_spawn(ctx, wss.Run(), boost::asio::detached);
	boost::asio::co_spawn(ctx, server.Run(std::move(endpoint)), boost::asio::detached);

	worker = std::jthread([&]()
						{
							ctx.run();
						});
}

void WebCast::Stop()
{
	ctx.stop();
}

void WebCast::Wait()
{
	worker = {};
}

boost::asio::awaitable<void> WebCast::ProcessRequest(HttpConnection& connection)
{
	//std::cout << connection.request.method() << ' ' << connection.request.target() << std::endl;
	//if (co_await ProcessGetApi(connection))
	//	co_return;
	if (co_await ProcessGetFile(connection))
		co_return;
	co_await server.RespondNotFound(connection);
}

boost::asio::awaitable<bool> WebCast::ProcessGetFile(HttpConnection& connection)
{
	auto method = connection.request.method();
	if (method != http::verb::get && method != http::verb::head)
	{
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
		co_await server.RespondInternalError(connection);
		co_return true;
	}

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
	//std::cout << "Connection opened" << std::endl;
	ws.onReceive = [this](auto& ws, const auto& message)
		{
			//std::cout << message << std::endl;
			FixedArrayCharS buffer;

			size_t offset = 0;
			auto handle = msgpack::unpack(buffer, buffer.size(), offset);
			auto& obj = handle.get();
			if (obj.type != msgpack::type::POSITIVE_INTEGER)
				return;

			auto type = obj.as<uint8_t>();

			auto i = callbacks.find(static_cast<MsgId>(type));
			if (i == callbacks.end())
			{
				Logger::LogWarn("Message {} has been discarded", type);
				return;
			}

			if (offset >= buffer.size())
				i->second({});
			else
				i->second(FixedArrayCharS::CreateArrayRef(buffer + offset, buffer.size() - offset));
		};
	ws.onClose = [](auto& ws)
		{
			//std::cout << "Connection closed" << std::endl;
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
	packer.write_raw(buffer);
	auto data = packer.copy_buffer();

	for (auto i = wss.wss.begin(); i != wss.wss.end(); ++i)
	{
		i->Send(data);
	}
}
