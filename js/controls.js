// Keep a calendar on the map with days with stories.

'use strict';

Saillog.Control = L.Control.extend({
	includes: L.Mixin.Events,

	container: function () {
		return $(this._container);
	},

	onAdd: function () {
		this._container = L.DomUtil.create('div', '');
		this._container.id = this.options.containerId;

		var control = this;

		this.container().on({
			'click mouseover mouseout': function (event) {
				control.fire(event.type + '-leg', {
					legId: $(event.target).data('legId')
				});
			}
		}, this);
		return this._container;
	},

	update: function (story) {
		this._story = story;
		return this.render();
	},

	render: function () {
		this.clear();
		if (!this._story) {
			return;
		}

		this._story.each(function (leg) {
			if (leg.properties.date) {
				var type = leg.geometry ? leg.geometry.type : null;
				this.addLeg(leg.properties, type);
			}
		}, this);

		return this;
	},

	highlight: function (id) {
		var legs = this.container().find('.leg');
		legs.each(function (key, element) {
			element = $(element);
			if (id === element.data('legId')) {
				element.addClass('active');
			} else {
				element.removeClass('active');
			}
		});
		return this;
	},

	clear: function () {
		this._container.innerHTML = '';
		return this;
	},

	hide: function () {
		this.container().hide();
	},
	show: function () {
		this.container().show();
	}
});

Saillog.Control.Calendar = Saillog.Control.extend({
	options: {
		position: 'topleft',
		containerId: 'calendar'
	},

	addLeg: function (leg) {
		var container = this.container();

		var parts = leg.date.split('-');
		var date = new Date(parts[0], parts[1] - 1, parts[2]);
		var day = parseInt(parts[2], 10);

		var item = $('<div class="leg"></div>')
			.data({'legId': leg.id})
			.attr('title', leg.title)
			.html(day);

		var diff = null;
		if (container.children().length < 1) {
			item.css('margin-left', (date.getDay() * 21) + 'px');
		} else {
			var last = container.children().last();
			diff = day - last.html();
			if (diff > 1) {
				// insert empty days to align days properly
				for (var j = diff; j > 1; j--) {
					container.append('<div class="filler"></div>');
				}
			}
		}
		// make weekend-days bold
		if (date.getDay() === 0 || date.getDay() === 6) {
			item.addClass('weekend');
		}

		// do not insert to items for one day.
		if (diff !== 0) {
			item.appendTo(container);
		}
	}
});

Saillog.Control.Timeline = Saillog.Control.extend({
	options: {
		position: 'bottomleft',
		containerId: 'timeline',
		speed: 5,
		opacity: 0.6,
		width: $(window).innerWidth() - 100
	},

	render: function () {
		if (!this._story) {
			return this;
		}

		this._times = this._story.getTimes();
		this._times.pps = this.options.width / this._times.span;

		Saillog.Control.prototype.render.call(this);

		return this._updateLabels();
	},

	_updateLabels: function () {
		function addDays(date, days) {
			date = new Date(date + 'T00:00:00');
			var DAY = 24 * 60 * 60 * 1000; //ms
			var UTC2CEST = 2 * 60 * 60 * 1000; // correct for timezone
			date.setTime(date.getTime() + days * DAY - UTC2CEST);
			return date;
		}

		var times = this._times;
		var spanDays = times.span / (24 * 60 * 60);
		var labels = [];
		for (var i = 0.75; i < spanDays + 0.75; i = i + 0.25) {
			labels.push(
				addDays(times.start.substr(0, 10), i)
			);
		}

		var offset = function (time) {
			return Saillog.util.timeDiff(time, times.start) * times.pps;
		};
		var container = $(this._labels);

		labels.forEach(function (label) {
			var css = {
				left: (Math.round(offset(label) * 100) / 100) + 'px'
			};

			var el = $('<div class="marker"></div>');

			if (label.getHours() === 0) {
				el.html(label.getDate() + '-' + (label.getMonth() + 1));
			} else {
				// TODO this parameter needs tuning.
				// add time labels if we have enough horzontal space
				if (times.pps > 0.003) {
					el.html(label.getHours() + ':00');
				}
			}

			$(el).add('<div class="mark"></div>')
				.addClass(label.getHours() === 0 ? 'major' : 'minor')
				.css(css)
				.attr('title', label.toGMTString())
				.appendTo(container);
		});

		return this;
	},

	onAdd: function (map) {
		var container = Saillog.Control.prototype.onAdd.call(this, map);

		this._reel = L.DomUtil.create('div', 'reel', container);
		this._labels = L.DomUtil.create('div', 'labels', container);

		var control = this;
		$(window).resize(function () {
			control.options.width = $(window).innerWidth() - 100;
			control.render();
		});
		return container;
	},

	clear: function () {
		this._reel.innerHTML = '';
		this._labels.innerHTML = '';
		return this;
	},

	_legCss: function (leg) {
		var color = Saillog.util.hexToRgb(leg.color);

		var duration = leg.duration || this.options.speed * leg.distance * (60);

		var left = this._times.offset(leg.startTime) * this._times.pps;
		var width = duration * this._times.pps;

		return {
			'background-color': color.toRgba(this.options.opacity),
			left: Math.round(left) + 'px',
			width: Math.round(width) + 'px'
		};
	},

	addLeg: function (leg, type) {
		if (!type || type === 'Point') {
			return;
		}
		var reel = $(this._reel);

		var item = $('<div class="leg"></div>')
			.data({legId: leg.id})
			.attr('title', leg.title)
			.css(this._legCss(leg));

		item.appendTo(reel);
	}
});

