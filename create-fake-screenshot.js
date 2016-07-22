var Canvas = require('canvas');
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

module.exports = function createSlackImage (text, time) {
  var canvas = new Canvas(800, 400);

  var ctx = canvas.getContext('2d');

  time = '4:20PM';

  ctx.fillStyle = 'white'; // background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2c2d30'; // stroke color

  ctx.beginPath();
  ctx.moveTo(30, 30);
  ctx.lineTo(90, 30);
  ctx.quadraticCurveTo(100, 30, 100, 40);
  ctx.lineTo(100, 100);
  ctx.quadraticCurveTo(100, 110, 90, 110);
  ctx.lineTo(30, 110);
  ctx.quadraticCurveTo(20, 110, 20, 100);
  ctx.lineTo(20, 40);
  ctx.quadraticCurveTo(20, 30, 30, 30);
  ctx.stroke();

  ctx.fillStyle = '#2c2d30'; // text color
  var options = {
    font: 'bold 24px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 120,
    paddingY: 20
  };
  CanvasTextWrapper(canvas, 'Hurr Slack', options);

  ctx.fillStyle = '#9e9ea6'; // text color
  options = {
    font: '15px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 250,
    paddingY: 30
  };
  CanvasTextWrapper(canvas, time, options);

  ctx.fillStyle = '#2c2d30'; // text color
  options = {
    font: '24px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 120,
    paddingY: 55
  };
  CanvasTextWrapper(canvas, text, options);
  var imageData = canvas.toDataURL('image/png');
  return imageData.substring(imageData.indexOf(',') + 1);
};
