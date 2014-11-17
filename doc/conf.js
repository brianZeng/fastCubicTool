/**
 * Created by 柏然 on 2014/11/17.
 */

var cfg={
  "scenes"://这个会出现在位置选择的菜单中
    [
  {"name":"展示厅"//菜单中显示的名称
    ,"res":["f.jpg","a.jpg"]//展示的图片，和dir属性组合
    ,"dir":"scene1"},//相对于public/resources/的文件夹路径
  {"name":"大门","res":["focus.jpg","aside.jpg"],"dir":"大门",
    "A":1.2,"B":0.7,"K":1 //计算时的参数，可以不写默认为 A:1 B:0.5 K:1
  },
  {"name":"GAP","res":["q1.jpg","q1.jpg"],"dir":"Gap"}
]
  ,
  "modes"://照明模式的菜单中显示
    [
  {"name":"重点照明",//菜单中显示的名称
    "weights":[1,0.66]// 每个图片的权重，图片顺序对应于res数组
  }
],
  "tem":{
  "min":3000,//色温的最小值
    "max":10000//色温的最大值
}
};
