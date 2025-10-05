#include "RealTimeThread.h"

RealTimeThread::RealTimeThread()
{
}

RealTimeThread::~RealTimeThread()
{
}

void RealTimeThread::Start()
{
	thread = std::jthread([this](std::stop_token token)
		{
			while (!token.stop_requested())
			{
				if (Tick)
					Tick();

				ctx.run_for(std::chrono::milliseconds(20));
			}
		});
}

void RealTimeThread::Stop()
{
	if (thread.joinable())
		thread.request_stop();
	ctx.stop();
}

void RealTimeThread::Wait()
{
	thread = {};
	ctx.restart();
}

bool RealTimeThread::IsStopping()
{
	return thread.get_stop_token().stop_requested();
}

void RealTimeThread::Dispatch(boost::asio::awaitable<void>&& coroutine)
{
	boost::asio::co_spawn(ctx, std::move(coroutine), boost::asio::detached);
}
