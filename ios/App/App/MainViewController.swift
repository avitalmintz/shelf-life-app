import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SharedShelfImagesPlugin())
        bridge?.registerPluginInstance(ShelfRemindersPlugin())
    }
}
