#include <array>
#include "RealTimeThread.h"
#include "SimCom/SimCom.h"
#include "TrafficRadar/AirplaneRadar.h"
#include "Utils/Logger.h"

extern SimCom simcom;
extern AirplaneRadar radar;

RealTimeThread::RealTimeThread()
{
	simcom.OnConnect = { MemberFunc<&RealTimeThread::OnSimConnect>, this };
	simcom.OnDisconnect = { MemberFunc<&RealTimeThread::OnSimDisconnect>, this };
}

RealTimeThread::~RealTimeThread()
{
}

void RealTimeThread::Start()
{
	thread = std::jthread([this](std::stop_token token)
		{
			std::unique_lock lock(cmdMutex);

			while (!token.stop_requested())
			{
				simcom.RunCallbacks();

				radar.OnUpdate();
				if (Tick)
					Tick();

				lock.unlock();
				std::this_thread::sleep_for(std::chrono::milliseconds(20));
				lock.lock();
			}

			simcom.Shutdown();
		});
}

void RealTimeThread::OnSimConnect()
{
	radar.Initialize();
	/*
	auto& simconnect = simcom.GetSimConnect();
	
	simconnect.SubscribeToSimStart([]()
		{
			Logger::Log("SimStart");
		});
	simconnect.SubscribeToSimStop([]()
		{
			Logger::Log("SimStop");
		});
	simconnect.SubscribeToPause([](bool paused)
		{
			Logger::Log("Paused: {}", paused);
		});
	*/
	if (SimConnectEvent)
		SimConnectEvent();
}

void RealTimeThread::OnSimDisconnect()
{
	if (SimDisconnectEvent)
		SimDisconnectEvent();

	radar.Shutdown();
}

void RealTimeThread::Stop()
{
	if (thread.joinable())
		thread.request_stop();
}

void RealTimeThread::Wait()
{
	thread = {};
}

bool RealTimeThread::IsStopping()
{
	return thread.get_stop_token().stop_requested();
}
