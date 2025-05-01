#pragma once
#include <string>
#include "SimConnect.h"
#include "Utils/Function.hpp"

class SimCom
{
private:
	SimConnect::Client simconnect;
	long long nextReconnect;
	std::string appName;
	bool isConnected;

	void OnDisconnected();

public:
	FunctionS<void()> OnConnect;
	FunctionS<void()> OnDisconnect;

	SimCom();
	~SimCom();

	bool Initialize();
	void Shutdown();
	void RunCallbacks();

	auto& GetSimConnect() { return simconnect; }
	auto& GetSimName() const { return appName; }
	bool IsConnected() { return isConnected; }
};
