#include "Transport.h"
#include "Utils/Logger.h"
#include "Utils/Time.h"

Transport::Transport()
{
	connectedCount = 0;
	nearestFreeSlot = 0;
	tickStart = 0;
	tickEnd = 0;

	for (int i = 0; i < SLOTS; ++i)
	{
		users[i].Setup(i);
	}
}

void Transport::Reset()
{
	nearestFreeSlot = 0;
	connectedCount = 0;
	for (int i = 0; i < SLOTS; ++i)
	{
		users[i].OnDisconnect();
	}
}

// main functions
bool Transport::Prepare(const char* address, unsigned short port)
{
	if (!socket.Create())
	{
		Logger::Log("Failed to create socket: {}", socket.GetLastError());
		return false;
	}
	socket.SetBlockingMode(false);
	if (!socket.Bind(address, port))
	{
		Logger::Log("Failed to bind at {}:{}", address, port);
		return false;
	}
	Logger::Log("Listening on {}:{}", address, port);

	Reset();
	ConnectFakePeer();

	return true;
}

void Transport::Run()
{
	char buffer[MaxPacketSize];
	WNET::Endpoint endpoint;
	tickStart = Time::SteadyNowInt();

	while (true)
	{
		int receivedSize = socket.ReceiveFrom(buffer, sizeof(buffer), endpoint);
		if (receivedSize > 0)
			HandlePacket(buffer, receivedSize, endpoint);
		else
			break;
	}

	tickEnd = Time::SteadyNowInt();
	UpdateTimers();
	CheckTick();
}

void Transport::Shutdown()
{
	socket.Close();
}

// Kick
bool Transport::Kick(SlotId id)
{
	if (id >= SLOTS || id == 0)
		return false;

	return Disconnect(users[id], DropReason::Kicked);
}

bool Transport::Disconnect(Connection& conn, DropReason reason)
{
	if (!conn.IsConnected())
		return false;

	auto address = conn.GetAddress();
	PacketDrop packet{ PacketType::Drop, reason };
	socket.SendTo(&packet, sizeof(packet), address);

	DisconnectInternal(conn);
	return true;
}

void Transport::DisconnectInternal(Connection& conn)
{
	conn.OnDisconnect();
	--connectedCount;

	auto id = conn.GetID();
	if (nearestFreeSlot > id)
		nearestFreeSlot = id;
}

// Send
void Transport::Send(SlotId id, const void* buff, int bufflen)
{
	if (id == 0)
		return;

	auto* pConn = GetConnection(id);
	if (!pConn)
		return;

	auto address = pConn->GetAddress();
	socket.SendTo(buff, bufflen, address);

	pConn->SetLastSend(tickStart);
}

void Transport::SendToAll(const void* buff, int bufflen)
{
	for (int i = 1; i < SLOTS; ++i)
	{
		auto& conn = users[i];
		if (conn.IsConnected())
		{
			auto address = conn.GetAddress();
			socket.SendTo(buff, bufflen, address);

			conn.SetLastSend(tickStart);
		}
	}
}

// Utilities
unsigned short Transport::GetConnectionCount()
{
	return connectedCount;
}

void Transport::ForEachConnection(std::function<void(const Connection&)> callback)
{
	for (int i = 0; i < SLOTS; ++i)
	{
		auto& conn = users[i];
		if (conn.IsConnected())
			callback(conn);
	}
}

// private utils
Connection* Transport::GetConnection(SlotId id)
{
	if (id < SLOTS)
	{
		auto* conn = users + id;
		if (conn->IsConnected())
			return conn;
	}

	return nullptr;
}

Connection* Transport::FindConnection(const WNET::Endpoint& ep)
{
	for (int i = 0; i < SLOTS; ++i)
	{
		auto* conn = users + i;
		if (*conn == ep)
			return conn;
	}

	return nullptr;
}

Connection* Transport::ConnectPeer(const WNET::Endpoint& ep)
{
	if (connectedCount >= SLOTS)
		return nullptr;

	++connectedCount;

	auto& conn = users[nearestFreeSlot];
	conn.OnConnect(ep);
	
	for (int i = nearestFreeSlot + 1; i < SLOTS; ++i)
	{
		if (!users[i].IsConnected())
		{
			nearestFreeSlot = i;
			break;
		}
	}

	OnConnected(conn);
	return &conn;
}

void Transport::ConnectFakePeer()
{
	auto handler = OnConnected;
	OnConnected = [](const Connection&) {};

	auto result = ConnectPeer({ 0, 0 });

	OnConnected = handler;
	if (!result)
		Logger::LogError("Fake peer could not connect");
}

void Transport::CheckTick()
{
	auto duration = tickEnd - tickStart;
	if (duration > Time::SecondToMs(1))
		Logger::LogWarn("Tick took {} ms", duration);
}

// Handler
void Transport::HandlePacket(const char* buff, int bufflen, const WNET::Endpoint& ep)
{
	auto type = ((PacketHeader*)buff)->header;
	auto* pConn = FindConnection(ep);

	if (!pConn)
	{
		// New connection
		if (type == PacketType::ConnNego)
			HandleNewConnection(buff, bufflen, ep);
	}
	else
	{
		// User is connected
		switch (type)
		{
			case PacketType::Drop:
			{
				OnDisconnected(*pConn);
				DisconnectInternal(*pConn);
				break;
			}

			case PacketType::Protocol:
			{
				pConn->SetLastReceive(tickStart);
				OnData(*pConn, buff, bufflen);
				break;
			}

			case PacketType::Heartbeat:
			{
				pConn->SetLastReceive(tickStart);
				break;
			}

			case PacketType::ConnNego:
			{
				HandleReconnection(buff, bufflen, ep, *pConn);
				break;
			}
		}
	}
}

void Transport::HandleNewConnection(const char* buff, int bufflen, const WNET::Endpoint& ep)
{
	if (bufflen >= sizeof(PacketConnNego))
	{
		if (connectedCount < SLOTS)
		{
			auto& packet = *(PacketConnNego*)buff;
			if (packet.proto == ProtoVersion && packet.rev == ProtoRevision)
			{
				auto& conn = *ConnectPeer(ep);

				PacketConnNegoResponse response{ PacketType::ConnNego, ProtoVersion, ProtoRevision };
				response.user = conn.GetID();
				socket.SendTo(&response, sizeof(response), ep);

				conn.SetLastSend(tickStart);
				conn.SetLastReceive(tickStart);
			}
			else
			{
				PacketDrop packet{ PacketType::Drop, DropReason::InvalidProto };
				socket.SendTo(&packet, sizeof(packet), ep);
			}
		}
		else
		{
			PacketDrop packet{ PacketType::Drop, DropReason::Full };
			socket.SendTo(&packet, sizeof(packet), ep);
		}
	}
}

void Transport::HandleReconnection(const char* buff, int bufflen, const WNET::Endpoint& ep, Connection& conn)
{
	if (bufflen >= sizeof(PacketConnNego))
	{
		auto& packet = *(PacketConnNego*)buff;
		if (packet.proto == ProtoVersion && packet.rev == ProtoRevision)
		{
			PacketConnNegoResponse response{ PacketType::ConnNego, ProtoVersion, ProtoRevision };
			response.user = conn.GetID();
			socket.SendTo(&response, sizeof(response), ep);

			conn.SetLastSend(tickStart);
			conn.SetLastReceive(tickStart);
		}
		else Disconnect(conn, DropReason::InvalidProto);
	}
	else Disconnect(conn, DropReason::Kicked);
}

// Timers
void Transport::UpdateTimers()
{
	constexpr long long Second = DefaultHeartbeatMs;
	constexpr long long Timeout = DefaultTimeoutMs;
	auto now = tickEnd;

	for (int i = 1; i < SLOTS; ++i)
	{
		auto& conn = users[i];
		if (!conn.IsConnected())
			continue;

		TimePoint lastTime = conn.GetLastReceive();
		if ((now - lastTime) >= Timeout)
		{
			Disconnect(conn, DropReason::TimedOut);
			Logger::Log("{} timed out", conn.GetID());
		}

		lastTime = conn.GetLastSend();
		if ((now - lastTime) >= Second)
		{
			auto address = conn.GetAddress();
			PacketHeader packet{ PacketType::Heartbeat };
			socket.SendTo(&packet, sizeof(packet), address);

			conn.SetLastSend(now);
		}
	}
}
