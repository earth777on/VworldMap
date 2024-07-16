import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QLineEdit, QLabel
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtCore import QUrl, pyqtSlot, QObject
from PyQt5.QtWebChannel import QWebChannel

class WebChannelHandler(QObject):
    @pyqtSlot(float, float)
    def updateCoordinates(self, lat, lng):
        print(f"Coordinates updated: Latitude={lat}, Longitude={lng}")

    @pyqtSlot(float, float)
    def receiveCoordinates(self, lat, lng):
        self.main_window.lat_input.setText(str(lat))
        self.main_window.lng_input.setText(str(lng))

    def set_main_window(self, main_window):
        self.main_window = main_window

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Map with Login")
        self.resize(800, 600)

        self.view = QWebEngineView()
        self.view.setUrl(QUrl("https://earth777on.github.io/VworldMap/vworld_map"))

        self.channel = QWebChannel()
        self.handler = WebChannelHandler()
        self.handler.set_main_window(self)
        self.channel.registerObject('pyObj', self.handler)
        self.view.page().setWebChannel(self.channel)

        # Create input fields for latitude and longitude
        self.lat_input = QLineEdit(self)
        self.lng_input = QLineEdit(self)
        self.lat_input.setPlaceholderText("Latitude")
        self.lng_input.setPlaceholderText("Longitude")

        self.update_button = QPushButton("Update Point", self)
        self.update_button.clicked.connect(self.update_point)

        # Create a layout and add widgets
        layout = QVBoxLayout()
        layout.addWidget(self.view)
        layout.addWidget(QLabel("Latitude:"))
        layout.addWidget(self.lat_input)
        layout.addWidget(QLabel("Longitude:"))
        layout.addWidget(self.lng_input)
        layout.addWidget(self.update_button)

        # Create a container widget and set the layout
        container = QWidget()
        container.setLayout(layout)

        self.setCentralWidget(container)

    def update_point(self):
        lat = float(self.lat_input.text())
        lng = float(self.lng_input.text())
        self.view.page().runJavaScript(f"updateMapPoint({lat}, {lng});")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
