/****************************************************************************
**
** Copyright (C) 2014 Klaralvdalens Datakonsult AB (KDAB).
** Contact: https://www.qt.io/contact-us/
**
** This file is part of the QtWebChannel module of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:LGPL$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** GNU Lesser General Public License Usage
** Alternatively, this file may be used under the terms of the GNU Lesser
** General Public License version 3 as published by the Free Software
** Foundation and appearing in the file LICENSE.LGPL3 included in the
** packaging of this file. Please review the following information to
** ensure the GNU Lesser General Public License version 3 requirements
** will be met: https://www.gnu.org/licenses/lgpl-3.0.html.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 2.0 or (at your option) the GNU General
** Public license version 3 or any later version approved by the KDE Free
** Qt Foundation. The licenses are as published by the Free Software
** Foundation and appearing in the file LICENSE.GPL2 and LICENSE.GPL3
** included in the packaging of this file. Please review the following
** information to ensure the GNU General Public License requirements will
** be met: https://www.gnu.org/licenses/gpl-2.0.html and
** https://www.gnu.org/licenses/gpl-3.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

function QWebChannelTransport() {
    this.send = function(message) {
        console.warn("You should override this method in a subclass.");
    };

    this.onmessage = function() {
        console.warn("You should override this method in a subclass.");
    };
}

function QWebChannel(transport, initCallback) {
    if (typeof transport !== "object" || typeof transport.send !== "function") {
        throw new Error("The QWebChannel expects a QWebChannelTransport object.");
    }

    var channel = this;
    this.transport = transport;

    this.send = function(data) {
        channel.transport.send(JSON.stringify(data));
    };

    this.objects = {};

    this.debug = false;
    this.debug && console.log("WebChannel connected");

    this.transport.onmessage = function(message) {
        var data = JSON.parse(message.data);
        if (channel.debug) {
            console.log("message received: " + message.data);
        }
        switch (data.type) {
            case "signal":
                var object = channel.objects[data.object];
                if (object) {
                    object.__qt_signals__[data.signal].apply(object, data.args);
                }
                break;
            case "propertyUpdate":
                for (var i in data.data) {
                    var dataObject = data.data[i];
                    var object = channel.objects[dataObject.object];
                    if (object) {
                        object.__qt_properties__[dataObject.property] = dataObject.value;
                    }
                }
                break;
            case "init":
                for (var objectName in data.data) {
                    var object = new QObject(objectName, data.data[objectName]);
                    channel.objects[objectName] = object;
                }
                if (initCallback) {
                    initCallback(channel);
                }
                channel.send({type: "idle"});
                break;
            default:
                console.error("invalid message received: " + message.data);
                break;
        }
    };
}

function QObject(name, data) {
    this.__id__ = name;
    this.__objectSignals__ = {};
    this.__objectSlots__ = {};
    this.__objectProperties__ = {};

    this.__qt_signals__ = {};
    this.__qt_slots__ = {};
    this.__qt_properties__ = {};

    for (var i in data.signals) {
        this.__qt_signals__[data.signals[i]] = new QSignal();
    }
    for (var i in data.slots) {
        this.__qt_slots__[data.slots[i]] = new QSlot();
    }
    for (var i in data.properties) {
        this.__qt_properties__[data.properties[i].name] = data.properties[i].value;
        this.__defineGetter__(data.properties[i].name, (function(propertyName) {
            return function() {
                return this.__qt_properties__[propertyName];
            };
        })(data.properties[i].name));
        this.__defineSetter__(data.properties[i].name, (function(propertyName) {
            return function(value) {
                var object = this;
                object.__qt_properties__[propertyName] = value;
                object.__qt_setProperty(propertyName, value);
            };
        })(data.properties[i].name));
    }

    this.__qt_setProperty = function(property, value) {
        var data = {
            type: "setProperty",
            object: this.__id__,
            property: property,
            value: value
        };
        this.__webChannel__.send(data);
    };

    for (var i in data.methods) {
        var methodData = data.methods[i];
        this[methodData.name] = this.__qt_generateMethod(methodData);
    }
}

QObject.prototype.__qt_generateMethod = function(methodData) {
    return function() {
        var args = [];
        for (var i = 0; i < methodData.parameters.length; ++i) {
            args.push(arguments[i]);
        }

        var data = {
            type: "invokeMethod",
            object: this.__id__,
            method: methodData.name,
            args: args
        };
        this.__webChannel__.send(data);
    };
};

QObject.prototype.__webChannel__ = null;

function QSignal() {
    var callbacks = [];
    this.connect = function(callback) {
        callbacks.push(callback);
    };
    this.disconnect = function(callback) {
        var index = callbacks.indexOf(callback);
        if (index >= 0) {
            callbacks.splice(index, 1);
        }
    };
    this.emit = function() {
        var args = arguments;
        callbacks.forEach(function(callback) {
            callback.apply(null, args);
        });
    };
}

function QSlot() {}
