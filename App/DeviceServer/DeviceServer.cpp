#include "Utils/Logger.h"
#include "DeviceServer.h"
#include "App/DeviceManager.h"

constexpr const char* Ip = "0.0.0.0";
constexpr unsigned int Port = DefaultPort;

DeviceServer::DeviceServer() : isActive(false)
{
	WNET::Subsystem::Initialize();

	transport.OnConnected = { MemberFunc<&DeviceServer::OnConnected>, this };
	transport.OnDisconnected = { MemberFunc<&DeviceServer::OnDisconnected>, this };
	transport.OnData = { MemberFunc<&DeviceServer::OnData>, this };
}

DeviceServer::~DeviceServer()
{
	WNET::Subsystem::Release();
}

void DeviceServer::Start()
{
	if (isActive)
		return;
	//prefs.Load();

	Logger::Log("Starting server...");
	//transport.Prepare(prefs.Ip, prefs.Port);
	if (!transport.Prepare(Ip, Port))
		return;

	isActive = true;
	if (OnStart)
		OnStart();
}

void DeviceServer::Stop()
{
	if (!isActive)
		return;

	if (OnStop)
		OnStop();

	Logger::Log("Stopping server...");
	KickAll();
	transport.Shutdown();
	isActive = false;
	Logger::Log("Server stopped");
}

void DeviceServer::Run()
{
	if (!isActive)
		return;
	transport.Run();
}

void DeviceServer::KickAll()
{
	transport.ForEachConnection([&](const Connection& conn)
		{
			Kick(conn.GetID());
		});
}

void DeviceServer::Kick(unsigned int id)
{
	if (transport.Kick(id))
		Logger::Log("{} has been kicked!", id);
}

void DeviceServer::PrintStatus()
{
	Logger::Log("Currently connected users: {}", transport.GetConnectionCount());
	transport.ForEachConnection([](const Connection& conn)
		{
			if (conn.GetID() == 0)
			{
				Logger::Log(" - ID: 0 - ADDRESS: SERVER");
				return;
			}
			auto info = conn.GetAddress().ToAddress();
			Logger::Log(" - ID: {} - ADDRESS: {}:{}", conn.GetID(), std::string_view(info.address), info.port);
		});
}

// transport callbacks
void DeviceServer::OnConnected(const Connection& conn)
{
	auto peerInfo = conn.GetAddress().ToAddress();
	Logger::Log("{}:{} - connected. Assigned ID: {}", std::string_view(peerInfo.address), peerInfo.port, conn.GetID());

	if (OnConnect)
		OnConnect(conn);
}

void DeviceServer::OnDisconnected(const Connection& conn)
{
	if (OnDisconnect)
		OnDisconnect(conn);

	auto peerInfo = conn.GetAddress().ToAddress();
	Logger::Log("{}:{}:{} - disconnected", std::string_view(peerInfo.address), peerInfo.port, conn.GetID());
}

void DeviceServer::OnData(const Connection& conn, const char* buff, int bufflen)
{
	if (bufflen < sizeof(PacketInput) || !OnInput)
		return;

	auto& packet = *(PacketInput*)(buff);
	OnInput(packet.inputId, packet.inputData);
}
