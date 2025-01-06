import { WeatherType, world } from "@minecraft/server"

export class Weather{
    static currentWeather: WeatherType
    static initialize() {
        const currentWeather = world.getDynamicProperty("weather") as WeatherType | undefined
        if (!currentWeather) {this.currentWeather = WeatherType.Clear} else this.currentWeather = currentWeather
        world.afterEvents.weatherChange.subscribe((data) => {
            world.setDynamicProperty("weather", data.newWeather)
            this.currentWeather = data.newWeather
        })
    }
}