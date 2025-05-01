#include "Connection.h"

Connection::Connection()
{
	isConnected = false;
	id = 0;
	address.address = 0;
	address.port = 0;
	lastReceived = 0;
	lastSent = 0;
}

void Connection::Setup(SlotId id)
{
	this->id = id;
}

SlotId Connection::GetID() const
{
	return id;
}

WNET::Endpoint Connection::GetAddress() const
{
	return address;
}

bool Connection::IsConnected() const
{
	return isConnected;
}

void Connection::OnConnect(const WNET::Endpoint& ep)
{
	address = ep;
	lastReceived = 0;
	lastSent = 0;
	isConnected = true;
}

void Connection::OnDisconnect()
{
	isConnected = false;
}

TimePoint Connection::GetLastReceive()
{
	return lastReceived;
}

TimePoint Connection::GetLastSend()
{
	return lastSent;
}

void Connection::SetLastReceive(TimePoint time)
{
	lastReceived = time;
}

void Connection::SetLastSend(TimePoint time)
{
	lastSent = time;
}

bool Connection::operator==(const WNET::Endpoint& ep)
{
	return isConnected && address.address == ep.address && address.port == ep.port;
}
