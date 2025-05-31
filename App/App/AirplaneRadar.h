#pragma once
#include <vector>
#include <string_view>
#include "Utils/Function.hpp"

struct Airplane;

class AirplaneRadar
{
private:
	std::vector<Airplane> airplanes;

	void Ident(Airplane& airplane);
	void Track(Airplane& airplane);

	void OnIdent(void* data, Airplane& airplane);
	void RemoveAll();
	void OnRemove(Airplane& airplane);

public:
	AirplaneRadar();
	~AirplaneRadar();

	void Initialize();
	void Shutdown();
	void Resync();
	
	void OnUpdate();
	Airplane& Add(unsigned int id);
	void Remove(unsigned int id);

	struct PlaneRemoveArgs
	{
		unsigned int id;
	};

	struct PlaneUpdateArgs
	{
		unsigned int id;
		double longitude;
		double latitude;
		double heading;
		int altitude;
		int groundSpeed;
		int groundAltitude;
		int indicatedSpeed;
		int verticalSpeed;
	};

	struct PlaneAddArgs : PlaneUpdateArgs
	{
		unsigned int id;
		std::string_view model;
		std::string_view callsign;
	};

	Function<void(const PlaneAddArgs& e)> OnPlaneAdd;
	Function<void(const PlaneRemoveArgs& e)> OnPlaneRemove;
	Function<void(const PlaneUpdateArgs& e)> OnPlaneUpdate;
	Function<void(const std::vector<PlaneAddArgs>& e)> OnResync;
};
