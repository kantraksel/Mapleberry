#include "WebSocket.hpp"
#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>

WebSocket::WebSocket(boost::beast::websocket::stream<boost::beast::tcp_stream>&& ws, boost::beast::flat_buffer&& buffer) : ws(std::move(ws)), buffer(std::move(buffer)), ctx(this->ws.get_executor())
{
	runningTasks = 0;
}

WebSocket::~WebSocket()
{
}

bool WebSocket::IsRunning()
{
	return runningTasks > 0;
}

void WebSocket::RunAsync()
{
	boost::asio::co_spawn(ctx, RunInternal(runningTasks), boost::asio::detached);
}

boost::asio::awaitable<void> WebSocket::RunInternal(TaskRef ref)
{
	boost::beast::error_code ec;
	while (true)
	{
		buffer.consume(buffer.size());

		co_await ws.async_read(buffer, boost::asio::redirect_error(ec));
		if (ec)
		{
			if (ws.is_open())
			{
				co_await CloseInternal(boost::beast::websocket::internal_error, runningTasks);
				continue;
			}
			else
				break;
		}

		if (ws.got_binary())
		{
			co_await CloseInternal(boost::beast::websocket::close_code::unknown_data, runningTasks);
			continue;
		}

		if (onReceive)
		{
			auto data = buffer.cdata();
			onReceive(*this, { (char*)data.data(), data.size() });
		}
	}

	if (onClose)
		onClose(*this);
}

boost::asio::awaitable<void> WebSocket::FlushSendInternal(TaskRef ref)
{
	while (!sendQueue.empty())
	{
		auto& message = sendQueue.front();

		boost::asio::const_buffer buffer{ message.data(), message.size() };
		ws.text(true);

		boost::beast::error_code ec;
		co_await ws.async_write(buffer, boost::asio::redirect_error(ec));
		if (ec)
		{
			while (!sendQueue.empty())
				sendQueue.pop();

			if (ws.is_open())
			{
				co_await CloseInternal(boost::beast::websocket::internal_error, runningTasks);
				continue;
			}
			break;
		}

		sendQueue.pop();
	}
}

void WebSocket::Send(std::string message)
{
	if (!ws.is_open())
		return;

	boost::asio::co_spawn(ctx, SendInternal(std::move(message), runningTasks), boost::asio::detached);
}

boost::asio::awaitable<void> WebSocket::SendInternal(std::string message, TaskRef ref)
{
	if (!ws.is_open())
		co_return;

	sendQueue.push(std::move(message));
	if (sendQueue.size() == 1)
		boost::asio::co_spawn(ctx, FlushSendInternal(runningTasks), boost::asio::detached);
}

void WebSocket::Close(boost::beast::websocket::close_code code)
{
	if (!ws.is_open())
		return;

	boost::asio::co_spawn(ctx, CloseInternal(code, runningTasks), boost::asio::detached);
}

boost::asio::awaitable<void> WebSocket::CloseInternal(boost::beast::websocket::close_code code, TaskRef ref)
{
	if (!ws.is_open())
		co_return;

	boost::beast::error_code ec;
	co_await ws.async_close(boost::beast::websocket::close_reason{ code }, boost::asio::redirect_error(ec));

	while (!sendQueue.empty())
		sendQueue.pop();
}
