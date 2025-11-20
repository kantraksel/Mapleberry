#include "SimCom.h"
#include "Utils/Time.h"
#include "Utils/version.h"
#include "Utils/Logger.h"

static constexpr long long ConnectTimeout = 5 * 60 * 1000;
static constexpr long long ReconnectCooldown = 60 * 1000;

SimCom::SimCom() : nextReconnect(INT64_MAX), isConnected(false), allowReconnect(true)
{
}

SimCom::~SimCom()
{
}

bool SimCom::Initialize()
{
	if (!simconnect.Initialize(Version::SimConnectName))
	{
		nextReconnect = Time::SteadyNowInt() + ReconnectCooldown;
		return false;
	}
	nextReconnect = Time::SteadyNowInt() + ConnectTimeout;

	simconnect.SetConnectCallback([&](const SimConnect::EventServer& event)
		{
			appName = event.appName;

			bool connected = isConnected;
			isConnected = true;
			if (!connected)
			{
				Logger::Log("Connected to {} {}.{}", event.appName, event.appVersionMajor, event.appVersionMinor);
				OnConnect();
			}
		});

	simconnect.SetDisconnectCallback([&]()
		{
			OnDisconnected(true);
		});

	simconnect.SetExceptionCallback([](const SimConnect::EventException& event)
		{
			Logger::LogError("SimConnect Exception: {} {} argument {:X}", event.exception, event.exceptionName, event.argId);
		});
	return true;
}

void SimCom::Shutdown()
{
	simconnect.Shutdown();
	OnDisconnected(false);
}

void SimCom::RunCallbacks()
{
	if (!isConnected && nextReconnect <= Time::SteadyNowInt())
		Initialize();

	while (simconnect.RunCallbacks());
}

void SimCom::OnDisconnected(bool reconnect)
{
	if (reconnect && allowReconnect)
		nextReconnect = Time::SteadyNowInt() + ReconnectCooldown;
	else
		nextReconnect = INT64_MAX;

	bool connected = isConnected;
	isConnected = false;
	if (connected)
	{
		Logger::Log("Disconnected from simulator");
		OnDisconnect();
	}
}

void SimCom::AllowReconnect(bool value)
{
	if (value)
	{
		if (simconnect.IsConnected())
			nextReconnect = Time::SteadyNowInt() + ConnectTimeout;
		else
			nextReconnect = Time::SteadyNowInt() + ReconnectCooldown;
		allowReconnect = true;
	}
	else
	{
		nextReconnect = INT64_MAX;
		allowReconnect = false;
	}
}
