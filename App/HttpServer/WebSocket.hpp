#include <queue>
#include <functional>
#include "Utils/Boost.h"
#include <boost/asio/awaitable.hpp>
#include <boost/asio/any_io_executor.hpp>
#include <boost/beast/core/flat_buffer.hpp>
#include <boost/beast/core/tcp_stream.hpp>
#include <boost/beast/websocket/rfc6455.hpp>
#include <boost/beast/websocket/stream.hpp>
#include "Utils/FixedArray.h"

struct TaskRef
{
	std::atomic_int& count;

	TaskRef(std::atomic_int& count) : count(count)
	{
		count++;
	}

	TaskRef(TaskRef&) = delete;
	TaskRef& operator=(TaskRef&) = delete;
	TaskRef(TaskRef&& other) noexcept : count(other.count)
	{
		count++;
	}
	TaskRef& operator=(TaskRef&&) = delete;

	~TaskRef()
	{
		count--;
	}
};

class WebSocket
{
public:
	WebSocket(boost::beast::websocket::stream<boost::beast::tcp_stream>&& ws, boost::beast::flat_buffer&& buffer);
	~WebSocket();

	WebSocket(WebSocket&&) = default;
	WebSocket& operator=(WebSocket&&) = default;

	void RunAsync();
	bool IsRunning();

	void Send(const std::string& message);
	void Send(const FixedArrayCharS& message);
	void Close(boost::beast::websocket::close_code code = boost::beast::websocket::close_code::normal);

	struct Message
	{
		FixedArrayCharS buffer;
		bool isText;

		std::string_view Text() const
		{
			return std::string_view(buffer, buffer.size());
		}

		FixedArrayCharS Binary() const
		{
			return buffer;
		}
	};

	std::function<void(WebSocket& ws, const Message&)> onReceive;
	std::function<void(WebSocket& ws)> onClose;

private:
	boost::asio::awaitable<void> RunInternal(TaskRef ref);
	boost::asio::awaitable<void> FlushSendInternal(TaskRef ref);
	boost::asio::awaitable<void> SendInternal(Message message, TaskRef ref);
	boost::asio::awaitable<void> CloseInternal(boost::beast::websocket::close_code code, TaskRef ref);

	boost::beast::websocket::stream<boost::beast::tcp_stream> ws;
	boost::beast::flat_buffer buffer;
	boost::asio::any_io_executor ctx;
	std::queue<Message> sendQueue;
	std::atomic_int runningTasks;
};
