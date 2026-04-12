import { NextRequest } from "next/server";
import { fetchWeatherApi } from 'openmeteo';

type Coordinates = {
    latitude: number;
    longitude: number;
    timezone: string;
}

export async function GET(request: NextRequest) {

    const location = request.nextUrl.searchParams.get('location')

    if (location === null) {
        return Response.json({ error: 'Location parameter is required' }, { status: 400 });
    }

    const coords: Coordinates | null = await getGeoDataFromLocation(location);

    if (coords === null) {
        return Response.json({ error: 'Location not found' }, { status: 400 });
    }

    const params = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        daily: ["temperature_2m_max", "temperature_2m_min", "weather_code"],
        current: ["temperature_2m", "is_day", "precipitation", "rain", "showers", "weather_code"],
        temperature_unit: "fahrenheit",
        timezone: coords.timezone,
    };

    const url = 'https://api.open-meteo.com/v1/forecast';
    const responses = await fetchWeatherApi(url, params);

    // Process first location. Add a for-loop for multiple locations or weather models
    const response = responses[0];

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const current = response.current()!;
    const daily = response.daily()!;

    const weatherData = {
        coords, 
        current: {
            time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
            temperature_2m: current.variables(0)!.value(),
            is_day: current.variables(1)!.value(),
            precipitation: current.variables(2)!.value(),
            rain: current.variables(3)!.value(),
            showers: current.variables(4)!.value(),
            weather_code: current.variables(5)!.value(),
        },
        daily: {
            time: Array.from(
                { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() }, 
                (_ , i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
            ),
            temperature_2m_max: daily.variables(0)!.valuesArray(),
            temperature_2m_min: daily.variables(1)!.valuesArray(),
            weather_code: daily.variables(2)!.valuesArray(),
        },
    };

    return Response.json({ weatherData });
}

const getGeoDataFromLocation = async (location: string): Promise<Coordinates | null> => {

    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`
    );
    const data = await res.json();

    if (!data.results) {
        return null;
    }

    const { latitude, longitude, timezone } = data.results[0];

    const coords: Coordinates = {
        latitude,
        longitude,
        timezone
    }

    return coords;

}