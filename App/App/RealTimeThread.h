#pragma once
#include "Utils/Boost.h"
#include <boost/asio.hpp>
#include "Utils/Function.hpp"

class RealTimeThread
{
private:
	std::jthread thread;
	boost::asio::io_context ctx;

public:
	RealTimeThread();
	~RealTimeThread();

	void Start();
	void Stop();
	void Wait();
	bool IsStopping();

	void Dispatch(boost::asio::awaitable<void>&& coroutine);

	FunctionS<void()> Tick;
};
