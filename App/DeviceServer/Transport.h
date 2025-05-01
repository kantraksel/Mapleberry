#pragma once
#include "Utils/Function.hpp"
#include "Connection.h"
#include "NetProto.h"

class Transport
{
	static constexpr int SLOTS = 3 + 1;

	private:
		WNET::UdpSocket socket;
		Connection users[SLOTS];
		unsigned short connectedCount;
		unsigned short nearestFreeSlot;

		TimePoint tickStart;
		TimePoint tickEnd;

		bool Disconnect(Connection& conn, DropReason reason);
		void DisconnectInternal(Connection& conn);
		void UpdateTimers();
		void CheckTick();
		
		void HandlePacket(const char* buff, int bufflen, const WNET::Endpoint& ep);
		void HandleNewConnection(const char* buff, int bufflen, const WNET::Endpoint& ep);
		Connection* ConnectPeer(const WNET::Endpoint& ep);
		void ConnectFakePeer();
		void HandleReconnection(const char* buff, int bufflen, const WNET::Endpoint& ep, Connection& conn);

		Connection* GetConnection(SlotId id);
		Connection* FindConnection(const WNET::Endpoint& ep);

	public:
		FunctionS<void(const Connection& conn)> OnConnected;
		FunctionS<void(const Connection& conn)> OnDisconnected;
		FunctionS<void(const Connection& conn, const char* buff, int bufflen)> OnData;

		Transport();
		void Reset();
		auto& GetSocket() { return socket; }

		bool Prepare(const char* address, unsigned short port);
		void Run();
		void Shutdown();

		bool Kick(SlotId id);
		void Send(SlotId id, const void* buff, int bufflen);
		void SendToAll(const void* buff, int bufflen);

		unsigned short GetConnectionCount();
		void ForEachConnection(std::function<void(const Connection&)> callback);
};
