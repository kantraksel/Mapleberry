#include <array>
#include "RealTimeThread.h"
#include "SimCom/SimCom.h"
#include "DeviceServer/DeviceServer.h"
#include "DeviceManager.h"
#include "AirplaneRadar.h"
#include "Utils/Logger.h"

extern SimCom simcom;
extern DeviceServer deviceServer;
extern DeviceManager deviceManager;
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
            cmdMutex.lock();
			deviceServer.Start();
			simcom.Initialize();
			
			std::array<WNET::PollFD, 1> fds;
			fds[0].fd = deviceServer.GetTransport().GetSocket().GetSocket();

			while (!token.stop_requested())
			{
				deviceServer.Run();
				simcom.RunCallbacks();

                radar.OnUpdate();
                if (Tick)
                    Tick();

                cmdMutex.unlock();
				WNET::PollFD::Poll(fds.data(), (int)fds.size(), 20);
                cmdMutex.lock();
			}

			simcom.Shutdown();
			deviceServer.Stop();
            cmdMutex.unlock();
		});
}

void RealTimeThread::OnSimConnect()
{
    deviceManager.Initialize();
    radar.Initialize();

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

    if (SimConnectEvent)
        SimConnectEvent();
}

void RealTimeThread::OnSimDisconnect()
{
    if (SimDisconnectEvent)
        SimDisconnectEvent();

    radar.Shutdown();
    deviceManager.Shutdown();
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
