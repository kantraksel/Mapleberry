#pragma once
#include <thread>
#include <mutex>
#include "Utils/Function.hpp"

class RealTimeThread
{
private:
	std::jthread thread;
	std::mutex cmdMutex;

	void OnSimConnect();
	void OnSimDisconnect();

public:
	RealTimeThread();
	~RealTimeThread();

	void Start();
	void Stop();
	void Wait();
	bool IsStopping();

	std::unique_lock<std::mutex> EnterCmdMode()
	{
		return std::unique_lock(cmdMutex);
	}

	FunctionS<void()> SimConnectEvent;
	FunctionS<void()> SimDisconnectEvent;
};
