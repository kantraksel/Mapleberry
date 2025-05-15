#pragma once
#include <vector>
#include <string>
#include "Utils/Function.hpp"

class LocalAircraft
{
private:
	unsigned int radarId;
	unsigned int objectId;
	std::string callsign;
	std::string model;
	bool spawned;

	void Track();

public:
	LocalAircraft();
	~LocalAircraft();

	void Initialize();
	void Resync();
	void Set(unsigned int objId);
	void Remove();

	struct PlaneAddArgs
	{
		std::string_view callsign;
		std::string_view model;
	};

	struct PlaneUpdateArgs
	{
		double longitude;
		double latitude;
		double heading;

		int altitude;
		int groundAltitude;

		int indicatedSpeed;
		int groundSpeed;
		int verticalSpeed;

		int realAltitude;
		double realHeading;
	};

	Function<void(const PlaneAddArgs& e)> OnAdd;
	Function<void()> OnRemove;
	Function<void(const PlaneUpdateArgs& e)> OnUpdate;
};
