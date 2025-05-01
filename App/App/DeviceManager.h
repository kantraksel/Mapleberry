#pragma once
#include "Radio.h"

class Connection;

class DeviceManager
{
private:
	bool connected;
	Radio radio;

	void OnConnect(const Connection& conn);
	void OnDisconnect(const Connection& conn);
	void InterpretData(unsigned int id, unsigned int value);

public:
	DeviceManager();
	~DeviceManager();

	bool Initialize();
	void Shutdown();

	void RebootIntoDevMode();
	bool IsConnected() { return connected; }

	FunctionS<void()> DeviceConnectEvent;
	FunctionS<void()> DeviceDisconnectEvent;
};
