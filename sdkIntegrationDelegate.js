export class SdkIntegrationDelegate {
    sdkIntegrationInitialized(sdkIntegration) {
        console.log("SDK integration initialized")
    }

    sdkIntegrationLanguageSwitched(sdkIntegration, language) {
        const newLanguage = language == 'ru' ? 'ru' : 'en'
        console.log(`document.__global_options: ${document.__global_options}`)
        const options = document.__global_options
        options.language = newLanguage
        translateGUI()
    }
}
