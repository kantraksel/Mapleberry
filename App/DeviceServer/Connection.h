#pragma once
#include "wnet.h"

typedef unsigned int SlotId;
typedef long long TimePoint;

class Connection
{
	private:
		bool isConnected;
		SlotId id;
		WNET::Endpoint address;

		TimePoint lastReceived;
		TimePoint lastSent;

	public:
		Connection();
		void Setup(SlotId id);

		SlotId GetID() const;
		WNET::Endpoint GetAddress() const;

		bool IsConnected() const;
		void OnConnect(const WNET::Endpoint& ep);
		void OnDisconnect();

		TimePoint GetLastReceive();
		TimePoint GetLastSend();
		void SetLastReceive(TimePoint time);
		void SetLastSend(TimePoint time);

		bool operator==(const WNET::Endpoint& ep);
};
