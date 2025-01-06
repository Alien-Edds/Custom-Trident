import { WeatherType, world } from "@minecraft/server";
export class Weather {
    static currentWeather;
    static initialize() {
        const currentWeather = world.getDynamicProperty("weather");
        if (!currentWeather) {
            this.currentWeather = WeatherType.Clear;
        }
        else
            this.currentWeather = currentWeather;
        world.afterEvents.weatherChange.subscribe((data) => {
            world.sendMessage(`weather changed to ${data.newWeather}`);
            world.setDynamicProperty("weather", data.newWeather);
            this.currentWeather = data.newWeather;
        });
    }
}
