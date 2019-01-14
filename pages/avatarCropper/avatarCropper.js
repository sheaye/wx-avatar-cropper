Page({

  data: {
    // movable-view左上角相对于movable-area的坐标x,y，
    // 由于movable-area左上角位于屏幕原点，因此x，y也是movable-view相对于屏幕的坐标
    x: 0,
    y: 0,
    scale: 1, // 用来控制moveable-view的缩放比例，回撤重置时需要

    src: {
      // 图片的源文件数据
      path: '',
      orientation: 'up',
      // width和height在最初时和屏幕尺寸做比较，做一个合适的缩放
      // 在截图的时候，计算方框在源图片的位置也需要用到width和height
      width: 0,
      height: 0,
      ratio: 1, // 图片的长宽比，最开始需要根据ratio判断图片的形状是长图还是宽图，进行合适的居中放置
    },
    image: {
      // 最初图片在屏幕上显示的宽度和高度
      // 经过缩放后也是基于这两个尺寸计算新的尺寸
      initialWidth: 0,
      initialHeight: 0,
      // 控制最初图片在屏幕中的位置
      initialX: 0,
      initialY: 0,
      // 经过缩放移动后图片在屏幕中的位置
      // 截图时找方框在源图片中的位置，是基于屏幕坐标系，所以需要图片的当前位置
      curX: 0,
      curY: 0,
      // 图片当前的缩放比例，用于计算图片当前显示的尺寸大小
      curScale: 1
    },
    // 屏幕尺寸windowWidth和windowHeight
    windowWidth: 0,
    windowHeight: 0,
    cropBorder: {
      // 截图的方框相对于屏幕中的位置
      x: 0,
      y: 0,
      // 截图方框的尺寸
      size: 0
    },
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    let that = this;
    let _src = JSON.parse(options.data);
    _src.ratio = _src.height / _src.width;
    let systemInfo = wx.getSystemInfoSync();
    // 屏幕内框范围（这里定义左右边界30，上下边际50)
    // 但是因为movable-view能超出movable-area的范围太小，为了尽量放大图片的活动范围，这里取消了这个边界
    // let borderWidth = systemInfo.windowWidth - 2 * 30
    // let borderHeight = systemInfo.windowHeight - 2 * 50
    let _image = that.data.image
    if (_src.width > systemInfo.windowWidth && _src.height > systemInfo.windowHeight) {
      // 如果图片尺寸大于屏幕尺寸，需要缩放
      if (_src.ratio > 1) {
        // 如果是长图，按照宽度进行缩放
        _image.initialWidth = systemInfo.windowWidth
        // >> 0用来取整
        _image.initialHeight = (_src.ratio * systemInfo.windowWidth) >> 0
      } else {
        // 如果是宽图，按照高度进行缩放
        _image.initialWidth = systemInfo.windowHeight,
          _image.initialHeight = (systemInfo.windowHeight / _src.ratio) >> 0
      }
    } else {
      _image.initialWidth = _src.width
      _image.initialHeight = _src.height
    }
    // 控制图片在屏幕居中
    _image.initialX = (systemInfo.windowWidth - _image.initialWidth) >> 1
    _image.initialY = (systemInfo.windowHeight - _image.initialHeight) >> 1
    console.log(JSON.stringify(_image))
    // 定义方框的位置和尺寸
    let _cropBorder = {}
    _cropBorder.size = systemInfo.windowWidth * 0.9
    _cropBorder.x = (systemInfo.windowWidth - _cropBorder.size) >> 1
    _cropBorder.y = (systemInfo.windowHeight - _cropBorder.size) >> 1
    that.setData({
      src: _src,
      image: _image,
      cropBorder: _cropBorder,
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight
    })
  },

  /**
   * 移动movable-view的回调
   */
  onChange(e) {
    console.log(e.detail)
    let that = this;
    that.setData({
      'image.curX': e.detail.x,
      'image.curY': e.detail.y
    })
  },

  /**
   * 缩放moveable-view的回调
   */
  onScale(e) {
    console.log(e.detail)
    let that = this;
    that.setData({
      'image.curX': e.detail.x,
      'image.curY': e.detail.y,
      'image.curScale': e.detail.scale
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    let that = this;
    let cropBorder = that.data.cropBorder
    this.context = wx.createCanvasContext('myCanvas')
    // 设置背景黑色透明度0.5，不要使用opacity，会导致后期截出来的图片也是半透明
    this.context.setFillStyle('rgba(0,0,0,0.5)')
    this.context.fillRect(0, 0, that.data.windowWidth, that.data.windowHeight)
    // 挖出来一个方框，这个方框区域就是全透明了
    this.context.clearRect(cropBorder.x, cropBorder.y, cropBorder.size, cropBorder.size)
    // 画方框的外框
    this.context.setStrokeStyle('white')
    // 往外画大一圈，这样在canvas上填充图片的时候框线就不会变细啦
    this.context.strokeRect(cropBorder.x - 1, cropBorder.y - 1, cropBorder.size + 2, cropBorder.size + 2)
    this.context.draw()
  },

  /**
   * 取消截图
   */
  cancel(event) {
    wx.navigateBack()
  },

  /**
   * 回撤，这地方有个问题：
   * 本来是想图片一次性移动和缩放回到最初的位置和大小，但是发现点击第一次只能实现图片移动到初始点
   * 点击第二次才是缩放到初始大小
   * 后来发现小程序移动有一个过程，会不停地回调onChange()，
   * 如果一定要实现，只能是当onChange中x，y归0之后再控制缩放，
   * 但是x和y是浮点数，零判断不精确而且影响性能，所以放弃了。
   */
  reset(event) {
    let that = this;
    that.setData({
      scale: 1,
      x: 0,
      y: 0,
    })
  },

  /**
   * 点击完成的回调
   * 完成截图，回传图片到上一页
   */
  complete(event) {
    let that = this
    let src = that.data.src
    console.log(src)
    let cropBorder = this.data.cropBorder
    let image = that.data.image
    // 当前图片显示的大小
    let curImageWidth = image.initialWidth * image.curScale
    let curImageHeight = image.initialHeight * image.curScale
    // 将方框位置换算到源图片中的位置srcX,srcY
    let srcX = (cropBorder.x - image.curX) / curImageWidth * src.width
    // canvas的height是100%，而bottom是120rpx，因此canvas的位置不是在原点，需要减去这个120rpx
    // 置于这里为什么要有个120，因为底部栏也是透明的，但字是亮的，我想呈现底部栏在上方不被遮罩挡住的效果
    let srcY = (cropBorder.y - image.curY - 120 / 750 * that.data.windowWidth) / curImageHeight * src.height
    // 方框区域映射到源图片中的尺寸
    let srcWidth = cropBorder.size / curImageWidth * src.width
    let srcHeight = cropBorder.size / curImageHeight * src.height
    console.log('srcX = ' + srcX + ', srcY = ' + srcY + ', srcWidth = ' + srcWidth + ', srcHeight = ' + srcHeight + ', cropX = ' + cropBorder.x + ', cropY = ' + cropBorder.y + ', cropSize = ' + cropBorder.size)
    // 绘制图片不要透明啦，不然会看到重影
    this.context.setFillStyle('rgba(0,0,0,1)')
    // 鉴于尺寸的精确度，方框内图片的覆盖在y方向会有微微的偏移，
    // 但是一旦截图就返回上一页了，强迫症患者没有后悔的余地。
    this.context.drawImage(src.path, srcX, srcY, srcWidth, srcHeight, cropBorder.x, cropBorder.y, cropBorder.size, cropBorder.size)
    // 这里绘图一定要有回调，不然图片还没绘制完成就截图那就GG了
    this.context.draw(true, function(res) {
      wx.canvasToTempFilePath({
        canvasId: 'myCanvas',
        x: cropBorder.x,
        y: cropBorder.y,
        width: cropBorder.size,
        height: cropBorder.size,
        destWidth: cropBorder.size,
        destHeight: cropBorder.size,
        fileType: 'jpg',
        success: function(data) {
          console.log(data)
          // 将图片回传到上一页
          var pages = getCurrentPages();
          if (pages.length > 1) {
            var prePage = pages[pages.length - 2];
            prePage.setData({
              avatarPath: data.tempFilePath
            })
          }
          wx.navigateBack()
        },
        fail: function(err) {
          console.log(err)
        }
      })
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  }
})