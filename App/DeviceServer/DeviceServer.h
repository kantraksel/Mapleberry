#pragma once
//#include "Preferences.h"
#include "Transport.h"
#include "Utils/Function.hpp"

class DeviceServer
{
	private:
		Transport transport;
		//Preferences prefs;
		bool isActive;

		void OnConnected(const Connection& conn);
		void OnDisconnected(const Connection& conn);
		void OnData(const Connection& conn, const char* buff, int bufflen);
		
	public:
		FunctionS<void()> OnStart;
		FunctionS<void()> OnStop;
		FunctionS<void(const Connection& conn)> OnConnect;
		FunctionS<void(const Connection& conn)> OnDisconnect;
		FunctionS<void(unsigned int, unsigned int)> OnInput;

		DeviceServer();
		~DeviceServer();

		void Start();
		void Stop();
		void Run();

		void KickAll();
		void Kick(unsigned int id);
		void PrintStatus();

		auto& GetTransport() { return transport; }
		bool IsRunning() { return isActive; }
};
