#include "DeviceManager.h"
#include "DeviceServer/NetProto.h"
#include "DeviceServer/DeviceServer.h"
#include "Utils/Logger.h"

extern DeviceServer deviceServer;

DeviceManager::DeviceManager() : connected(false)
{
	deviceServer.OnConnect = { MemberFunc<&DeviceManager::OnConnect>, this };
	deviceServer.OnDisconnect = { MemberFunc<&DeviceManager::OnDisconnect>, this };
	deviceServer.OnInput = { MemberFunc<&DeviceManager::InterpretData>, this };
}

DeviceManager::~DeviceManager()
{
}

bool DeviceManager::Initialize()
{
	radio.Initialize();
	return true;
}

void DeviceManager::Shutdown()
{
	radio.Shutdown();
}

void DeviceManager::InterpretData(unsigned int id, unsigned int value)
{
	if (id == 0x85978597)
		radio.InterpretData(value);
}

void DeviceManager::RebootIntoDevMode()
{
	PacketRpc rpc{ PacketType::Protocol, ClientRpc::RebootDev };
	deviceServer.GetTransport().SendToAll(&rpc, sizeof(rpc));
}

void DeviceManager::OnConnect(const Connection& conn)
{
	if (deviceServer.GetTransport().GetConnectionCount() > 2)
		return;
	connected = true;

	if (DeviceConnectEvent)
		DeviceConnectEvent();
}

void DeviceManager::OnDisconnect(const Connection& conn)
{
	if (deviceServer.GetTransport().GetConnectionCount() > 1)
		return;
	if (DeviceDisconnectEvent)
		DeviceDisconnectEvent();

	connected = false;
}

