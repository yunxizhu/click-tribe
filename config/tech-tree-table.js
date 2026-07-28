/** Tech tree table: layout / requires / cost / maxRepeat / repeatCosts / description / levelEffects / effects. */
window.TECH_TREE_TABLE = {
  "version": 23,
  "canvas": {
    "width": 5600,
    "height": 5800
  },
  "techs": {
    "unlock_workbench": {
      "x": 2000,
      "y": 2000,
      "parent": null,
      "size": "medium",
      "cost": {
        "wood": 5
      },
      "description": "解锁工作台，开启科技研发",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "workbench"
        },
        {
          "type": "onUnlock",
          "action": "flashWorkbench"
        },
        {
          "type": "onUnlock",
          "action": "maybeGrantStarterChest"
        }
      ]
    },
    "unlock_forest": {
      "x": 4292,
      "y": 2143,
      "parent": null,
      "size": "medium",
      "cost": {},
      "description": "开局已解锁。砍伐树木获取木头，并可在此升级森林采集",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "forest"
        }
      ]
    },
    "unlock_plank_craft": {
      "x": 2230,
      "y": 2548,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {},
      "requires": "unlock_workbench",
      "description": "解锁木板配方（5木头→1木板）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_plank"
        }
      ]
    },
    "unlock_auto_produce": {
      "x": 2574,
      "y": 2001,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {
        "plank": 5,
        "stone_slab": 5
      },
      "requires": "unlock_tool_crafting",
      "description": "解锁合成配方的自动生产：队列清空后可按设定自动补单",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "autoProduce"
        }
      ]
    },
    "unlock_altar": {
      "x": -966,
      "y": 2032,
      "parent": null,
      "size": "medium",
      "cost": {},
      "description": "建造神坛，开启庇护体系。外侧神坛点位将解锁，并可研发四类庇护",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "altar"
        }
      ]
    },
    "unlock_sanctuary_gather": {
      "x": -1222,
      "y": 2050,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 16,
        "stone": 14,
        "food": 20
      },
      "requires": "unlock_altar",
      "description": "解锁采集庇护：采集时有概率获得额外产量（默认 5% 概率、1.5 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "unlock"
        }
      ]
    },
    "unlock_sanctuary_craft": {
      "x": -1225,
      "y": 2297,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 18,
        "brick": 8,
        "stone_slab": 8
      },
      "requires": "unlock_altar",
      "description": "解锁生产庇护：完成订单时有概率返还消耗材料（默认 25% 概率、返还 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "unlock"
        }
      ]
    },
    "unlock_sanctuary_war": {
      "x": -751,
      "y": 2297,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 16,
        "iron_ingot": 4,
        "stone_slab": 10
      },
      "requires": "unlock_altar",
      "description": "解锁战争庇护：友军攻击有概率暴击（默认 5% 概率、1.5 倍暴击伤）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "unlock"
        }
      ]
    },
    "unlock_sanctuary_efficiency": {
      "x": -559,
      "y": 2038,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 20,
        "glass": 8,
        "pitch": 6
      },
      "requires": "unlock_altar",
      "description": "解锁效率庇护：白天每整点判定一次，触发后短时提升全部工作效率（默认 25% 概率、1.5 倍、持续 20 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "unlock"
        }
      ]
    },
    "unlock_sanctuary_gather_chance_v1": {
      "x": -1482,
      "y": 1930,
      "parent": "unlock_sanctuary_gather",
      "size": "medium",
      "cost": {
        "wood": 15,
        "plank": 8
      },
      "requires": "unlock_sanctuary_gather",
      "description": "采集庇护触发概率 +2%/级（解锁采集庇护后生效，默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "chance",
          "series": "unlock_sanctuary_gather_chance"
        }
      ]
    },
    "unlock_sanctuary_gather_chance_v2": {
      "x": -1642,
      "y": 1930,
      "parent": "unlock_sanctuary_gather_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 12
      },
      "requires": "unlock_sanctuary_gather_chance_v1",
      "description": "采集庇护触发概率 +2%/级（解锁采集庇护后生效，默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "chance",
          "series": "unlock_sanctuary_gather_chance"
        }
      ]
    },
    "unlock_sanctuary_gather_chance_v3": {
      "x": -1802,
      "y": 1930,
      "parent": "unlock_sanctuary_gather_chance_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 14
      },
      "requires": "unlock_sanctuary_gather_chance_v2",
      "description": "采集庇护触发概率 +2%/级（解锁采集庇护后生效，默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "chance",
          "series": "unlock_sanctuary_gather_chance"
        }
      ]
    },
    "unlock_sanctuary_gather_chance_v4": {
      "x": -1962,
      "y": 1930,
      "parent": "unlock_sanctuary_gather_chance_v3",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      },
      "requires": "unlock_sanctuary_gather_chance_v3",
      "description": "采集庇护触发概率 +2%/级（解锁采集庇护后生效，默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "chance",
          "series": "unlock_sanctuary_gather_chance"
        }
      ]
    },
    "unlock_sanctuary_gather_chance_v5": {
      "x": -2122,
      "y": 1930,
      "parent": "unlock_sanctuary_gather_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "glass": 6
      },
      "requires": "unlock_sanctuary_gather_chance_v4",
      "description": "采集庇护触发概率 +2%/级（解锁采集庇护后生效，默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "chance",
          "series": "unlock_sanctuary_gather_chance"
        }
      ]
    },
    "unlock_sanctuary_gather_power_v1": {
      "x": -1482,
      "y": 2170,
      "parent": "unlock_sanctuary_gather",
      "size": "medium",
      "cost": {
        "wood": 12,
        "stone": 10
      },
      "requires": "unlock_sanctuary_gather",
      "description": "采集庇护触发时产量倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "power",
          "series": "unlock_sanctuary_gather_power"
        }
      ]
    },
    "unlock_sanctuary_gather_power_v2": {
      "x": -1642,
      "y": 2170,
      "parent": "unlock_sanctuary_gather_power_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone_slab": 8
      },
      "requires": "unlock_sanctuary_gather_power_v1",
      "description": "采集庇护触发时产量倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "power",
          "series": "unlock_sanctuary_gather_power"
        }
      ]
    },
    "unlock_sanctuary_gather_power_v3": {
      "x": -1802,
      "y": 2170,
      "parent": "unlock_sanctuary_gather_power_v2",
      "size": "medium",
      "cost": {
        "brick": 8,
        "clay": 12
      },
      "requires": "unlock_sanctuary_gather_power_v2",
      "description": "采集庇护触发时产量倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "power",
          "series": "unlock_sanctuary_gather_power"
        }
      ]
    },
    "unlock_sanctuary_gather_power_v4": {
      "x": -1961,
      "y": 2171,
      "parent": "unlock_sanctuary_gather_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "plank": 12
      },
      "requires": "unlock_sanctuary_gather_power_v3",
      "description": "采集庇护触发时产量倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "power",
          "series": "unlock_sanctuary_gather_power"
        }
      ]
    },
    "unlock_sanctuary_gather_power_v5": {
      "x": -2122,
      "y": 2170,
      "parent": "unlock_sanctuary_gather_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "glass": 8
      },
      "requires": "unlock_sanctuary_gather_power_v4",
      "description": "采集庇护触发时产量倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "gather",
          "role": "power",
          "series": "unlock_sanctuary_gather_power"
        }
      ]
    },
    "unlock_sanctuary_craft_chance_v1": {
      "x": -1345,
      "y": 2557,
      "parent": "unlock_sanctuary_craft",
      "size": "medium",
      "cost": {
        "plank": 12,
        "wood": 10
      },
      "requires": "unlock_sanctuary_craft",
      "description": "生产庇护返还触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "chance",
          "series": "unlock_sanctuary_craft_chance"
        }
      ]
    },
    "unlock_sanctuary_craft_chance_v2": {
      "x": -1345,
      "y": 2717,
      "parent": "unlock_sanctuary_craft_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone": 12
      },
      "requires": "unlock_sanctuary_craft_chance_v1",
      "description": "生产庇护返还触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "chance",
          "series": "unlock_sanctuary_craft_chance"
        }
      ]
    },
    "unlock_sanctuary_craft_chance_v3": {
      "x": -1345,
      "y": 2877,
      "parent": "unlock_sanctuary_craft_chance_v2",
      "size": "medium",
      "cost": {
        "brick": 8,
        "stone_slab": 8
      },
      "requires": "unlock_sanctuary_craft_chance_v2",
      "description": "生产庇护返还触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "chance",
          "series": "unlock_sanctuary_craft_chance"
        }
      ]
    },
    "unlock_sanctuary_craft_chance_v4": {
      "x": -1345,
      "y": 3037,
      "parent": "unlock_sanctuary_craft_chance_v3",
      "size": "medium",
      "cost": {
        "brick": 12,
        "pitch": 5
      },
      "requires": "unlock_sanctuary_craft_chance_v3",
      "description": "生产庇护返还触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "chance",
          "series": "unlock_sanctuary_craft_chance"
        }
      ]
    },
    "unlock_sanctuary_craft_chance_v5": {
      "x": -1345,
      "y": 3197,
      "parent": "unlock_sanctuary_craft_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "gear": 2
      },
      "requires": "unlock_sanctuary_craft_chance_v4",
      "description": "生产庇护返还触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "chance",
          "series": "unlock_sanctuary_craft_chance"
        }
      ]
    },
    "unlock_sanctuary_craft_power_v1": {
      "x": -1105,
      "y": 2557,
      "parent": "unlock_sanctuary_craft",
      "size": "medium",
      "cost": {
        "plank": 10,
        "stone": 10
      },
      "requires": "unlock_sanctuary_craft",
      "description": "生产庇护触发时返还比例 +5%/级（默认返还 25%，满级 50%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "refund",
          "series": "unlock_sanctuary_craft_power"
        }
      ]
    },
    "unlock_sanctuary_craft_power_v2": {
      "x": -1105,
      "y": 2717,
      "parent": "unlock_sanctuary_craft_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "plank": 12
      },
      "requires": "unlock_sanctuary_craft_power_v1",
      "description": "生产庇护触发时返还比例 +5%/级（默认返还 25%，满级 50%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "refund",
          "series": "unlock_sanctuary_craft_power"
        }
      ]
    },
    "unlock_sanctuary_craft_power_v3": {
      "x": -1105,
      "y": 2877,
      "parent": "unlock_sanctuary_craft_power_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "clay": 10
      },
      "requires": "unlock_sanctuary_craft_power_v2",
      "description": "生产庇护触发时返还比例 +5%/级（默认返还 25%，满级 50%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "refund",
          "series": "unlock_sanctuary_craft_power"
        }
      ]
    },
    "unlock_sanctuary_craft_power_v4": {
      "x": -1105,
      "y": 3037,
      "parent": "unlock_sanctuary_craft_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "glass": 6
      },
      "requires": "unlock_sanctuary_craft_power_v3",
      "description": "生产庇护触发时返还比例 +5%/级（默认返还 25%，满级 50%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "refund",
          "series": "unlock_sanctuary_craft_power"
        }
      ]
    },
    "unlock_sanctuary_craft_power_v5": {
      "x": -1105,
      "y": 3197,
      "parent": "unlock_sanctuary_craft_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "gear": 2
      },
      "requires": "unlock_sanctuary_craft_power_v4",
      "description": "生产庇护触发时返还比例 +5%/级（默认返还 25%，满级 50%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "craft",
          "role": "refund",
          "series": "unlock_sanctuary_craft_power"
        }
      ]
    },
    "unlock_sanctuary_war_chance_v1": {
      "x": -871,
      "y": 2557,
      "parent": "unlock_sanctuary_war",
      "size": "medium",
      "cost": {
        "wood": 14,
        "plank": 8
      },
      "requires": "unlock_sanctuary_war",
      "description": "战斗暴击率 +5%/级（默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "chance",
          "series": "unlock_sanctuary_war_chance"
        }
      ]
    },
    "unlock_sanctuary_war_chance_v2": {
      "x": -871,
      "y": 2717,
      "parent": "unlock_sanctuary_war_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone_slab": 8
      },
      "requires": "unlock_sanctuary_war_chance_v1",
      "description": "战斗暴击率 +5%/级（默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "chance",
          "series": "unlock_sanctuary_war_chance"
        }
      ]
    },
    "unlock_sanctuary_war_chance_v3": {
      "x": -871,
      "y": 2877,
      "parent": "unlock_sanctuary_war_chance_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      },
      "requires": "unlock_sanctuary_war_chance_v2",
      "description": "战斗暴击率 +5%/级（默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "chance",
          "series": "unlock_sanctuary_war_chance"
        }
      ]
    },
    "unlock_sanctuary_war_chance_v4": {
      "x": -871,
      "y": 3037,
      "parent": "unlock_sanctuary_war_chance_v3",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "pitch": 5
      },
      "requires": "unlock_sanctuary_war_chance_v3",
      "description": "战斗暴击率 +5%/级（默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "chance",
          "series": "unlock_sanctuary_war_chance"
        }
      ]
    },
    "unlock_sanctuary_war_chance_v5": {
      "x": -871,
      "y": 3197,
      "parent": "unlock_sanctuary_war_chance_v4",
      "size": "medium",
      "cost": {
        "steel": 2,
        "gear": 2
      },
      "requires": "unlock_sanctuary_war_chance_v4",
      "description": "战斗暴击率 +5%/级（默认 5%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "chance",
          "series": "unlock_sanctuary_war_chance"
        }
      ]
    },
    "unlock_sanctuary_war_power_v1": {
      "x": -631,
      "y": 2557,
      "parent": "unlock_sanctuary_war",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 12
      },
      "requires": "unlock_sanctuary_war",
      "description": "暴击伤害倍率 +0.1/级（默认 1.5 倍，满级 2 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "critMult",
          "series": "unlock_sanctuary_war_power"
        }
      ]
    },
    "unlock_sanctuary_war_power_v2": {
      "x": -631,
      "y": 2717,
      "parent": "unlock_sanctuary_war_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 12
      },
      "requires": "unlock_sanctuary_war_power_v1",
      "description": "暴击伤害倍率 +0.1/级（默认 1.5 倍，满级 2 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "critMult",
          "series": "unlock_sanctuary_war_power"
        }
      ]
    },
    "unlock_sanctuary_war_power_v3": {
      "x": -631,
      "y": 2877,
      "parent": "unlock_sanctuary_war_power_v2",
      "size": "medium",
      "cost": {
        "brick": 12,
        "pitch": 6
      },
      "requires": "unlock_sanctuary_war_power_v2",
      "description": "暴击伤害倍率 +0.1/级（默认 1.5 倍，满级 2 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "critMult",
          "series": "unlock_sanctuary_war_power"
        }
      ]
    },
    "unlock_sanctuary_war_power_v4": {
      "x": -631,
      "y": 3037,
      "parent": "unlock_sanctuary_war_power_v3",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "glass": 6
      },
      "requires": "unlock_sanctuary_war_power_v3",
      "description": "暴击伤害倍率 +0.1/级（默认 1.5 倍，满级 2 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "critMult",
          "series": "unlock_sanctuary_war_power"
        }
      ]
    },
    "unlock_sanctuary_war_power_v5": {
      "x": -631,
      "y": 3197,
      "parent": "unlock_sanctuary_war_power_v4",
      "size": "medium",
      "cost": {
        "steel": 3,
        "gear": 2
      },
      "requires": "unlock_sanctuary_war_power_v4",
      "description": "暴击伤害倍率 +0.1/级（默认 1.5 倍，满级 2 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "war",
          "role": "critMult",
          "series": "unlock_sanctuary_war_power"
        }
      ]
    },
    "unlock_sanctuary_eff_chance_v1": {
      "x": -290,
      "y": 2237,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "wood": 16,
        "plank": 8
      },
      "requires": "unlock_sanctuary_efficiency",
      "description": "日间整点效率庇护触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "chance",
          "series": "unlock_sanctuary_eff_chance"
        }
      ]
    },
    "unlock_sanctuary_eff_chance_v2": {
      "x": -130,
      "y": 2237,
      "parent": "unlock_sanctuary_eff_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone": 12
      },
      "requires": "unlock_sanctuary_eff_chance_v1",
      "description": "日间整点效率庇护触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "chance",
          "series": "unlock_sanctuary_eff_chance"
        }
      ]
    },
    "unlock_sanctuary_eff_chance_v3": {
      "x": 30,
      "y": 2237,
      "parent": "unlock_sanctuary_eff_chance_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "brick": 8
      },
      "requires": "unlock_sanctuary_eff_chance_v2",
      "description": "日间整点效率庇护触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "chance",
          "series": "unlock_sanctuary_eff_chance"
        }
      ]
    },
    "unlock_sanctuary_eff_chance_v4": {
      "x": 189,
      "y": 2238,
      "parent": "unlock_sanctuary_eff_chance_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "glass": 8
      },
      "requires": "unlock_sanctuary_eff_chance_v3",
      "description": "日间整点效率庇护触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "chance",
          "series": "unlock_sanctuary_eff_chance"
        }
      ]
    },
    "unlock_sanctuary_eff_chance_v5": {
      "x": 350,
      "y": 2237,
      "parent": "unlock_sanctuary_eff_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "lime": 4
      },
      "requires": "unlock_sanctuary_eff_chance_v4",
      "description": "日间整点效率庇护触发概率 +5%/级（默认 25%）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "chance",
          "series": "unlock_sanctuary_eff_chance"
        }
      ]
    },
    "unlock_sanctuary_eff_power_v1": {
      "x": -290,
      "y": 2027,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      },
      "requires": "unlock_sanctuary_efficiency",
      "description": "效率庇护触发时工作效率倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "power",
          "series": "unlock_sanctuary_eff_power"
        }
      ]
    },
    "unlock_sanctuary_eff_power_v2": {
      "x": -130,
      "y": 2027,
      "parent": "unlock_sanctuary_eff_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 12
      },
      "requires": "unlock_sanctuary_eff_power_v1",
      "description": "效率庇护触发时工作效率倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "power",
          "series": "unlock_sanctuary_eff_power"
        }
      ]
    },
    "unlock_sanctuary_eff_power_v3": {
      "x": 30,
      "y": 2027,
      "parent": "unlock_sanctuary_eff_power_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      },
      "requires": "unlock_sanctuary_eff_power_v2",
      "description": "效率庇护触发时工作效率倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "power",
          "series": "unlock_sanctuary_eff_power"
        }
      ]
    },
    "unlock_sanctuary_eff_power_v4": {
      "x": 190,
      "y": 2027,
      "parent": "unlock_sanctuary_eff_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 8,
        "glass": 8
      },
      "requires": "unlock_sanctuary_eff_power_v3",
      "description": "效率庇护触发时工作效率倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "power",
          "series": "unlock_sanctuary_eff_power"
        }
      ]
    },
    "unlock_sanctuary_eff_power_v5": {
      "x": 349,
      "y": 2022,
      "parent": "unlock_sanctuary_eff_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "gear": 2
      },
      "requires": "unlock_sanctuary_eff_power_v4",
      "description": "效率庇护触发时工作效率倍率 +0.3/级（默认 1.5 倍，满级 3 倍）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "power",
          "series": "unlock_sanctuary_eff_power"
        }
      ]
    },
    "unlock_sanctuary_eff_duration_v1": {
      "x": -293,
      "y": 1839,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "wood": 14,
        "plank": 10
      },
      "requires": "unlock_sanctuary_efficiency",
      "description": "效率庇护持续时间 +8 游戏分钟/级（默认 20 分钟，满级 60 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "duration",
          "series": "unlock_sanctuary_eff_duration"
        }
      ]
    },
    "unlock_sanctuary_eff_duration_v2": {
      "x": -135,
      "y": 1841,
      "parent": "unlock_sanctuary_eff_duration_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone_slab": 8
      },
      "requires": "unlock_sanctuary_eff_duration_v1",
      "description": "效率庇护持续时间 +8 游戏分钟/级（默认 20 分钟，满级 60 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "duration",
          "series": "unlock_sanctuary_eff_duration"
        }
      ]
    },
    "unlock_sanctuary_eff_duration_v3": {
      "x": 26,
      "y": 1840,
      "parent": "unlock_sanctuary_eff_duration_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "clay": 10
      },
      "requires": "unlock_sanctuary_eff_duration_v2",
      "description": "效率庇护持续时间 +8 游戏分钟/级（默认 20 分钟，满级 60 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "duration",
          "series": "unlock_sanctuary_eff_duration"
        }
      ]
    },
    "unlock_sanctuary_eff_duration_v4": {
      "x": 186,
      "y": 1840,
      "parent": "unlock_sanctuary_eff_duration_v3",
      "size": "medium",
      "cost": {
        "glass": 8,
        "pitch": 6
      },
      "requires": "unlock_sanctuary_eff_duration_v3",
      "description": "效率庇护持续时间 +8 游戏分钟/级（默认 20 分钟，满级 60 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "duration",
          "series": "unlock_sanctuary_eff_duration"
        }
      ]
    },
    "unlock_sanctuary_eff_duration_v5": {
      "x": 345,
      "y": 1839,
      "parent": "unlock_sanctuary_eff_duration_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "lime": 6
      },
      "requires": "unlock_sanctuary_eff_duration_v4",
      "description": "效率庇护持续时间 +8 游戏分钟/级（默认 20 分钟，满级 60 分钟）",
      "effects": [
        {
          "type": "sanctuary",
          "branch": "efficiency",
          "role": "duration",
          "series": "unlock_sanctuary_eff_duration"
        }
      ]
    },
    "unlock_house_upgrade_1": {
      "x": 1650,
      "y": 1932,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 15,
        "stone": 8
      },
      "requires": "unlock_workbench",
      "description": "解锁房屋升级至「木石基座」（人口上限 2→4）",
      "effects": [
        {
          "type": "houseUpgrade",
          "level": 1
        }
      ]
    },
    "unlock_house_upgrade_2": {
      "x": 1450,
      "y": 2032,
      "parent": "unlock_house_upgrade_1",
      "size": "medium",
      "cost": {
        "clay": 12,
        "stone": 10,
        "wood": 10
      },
      "requires": "unlock_house_upgrade_1",
      "description": "解锁房屋升级至「砖瓦开窗」（人口上限 4→8）",
      "effects": [
        {
          "type": "houseUpgrade",
          "level": 2
        }
      ]
    },
    "unlock_house_upgrade_3": {
      "x": 1250,
      "y": 1932,
      "parent": "unlock_house_upgrade_2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "glass": 4,
        "plank": 12
      },
      "requires": "unlock_house_upgrade_2",
      "description": "解锁房屋升级至「灰浆厅堂」（人口上限 8→16）",
      "effects": [
        {
          "type": "houseUpgrade",
          "level": 3
        }
      ]
    },
    "unlock_house_upgrade_4": {
      "x": 1050,
      "y": 2032,
      "parent": "unlock_house_upgrade_3",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "coke": 3,
        "limestone": 4
      },
      "requires": "unlock_house_upgrade_3",
      "description": "解锁房屋升级至「精钢堡垒」（人口上限 16→32）",
      "effects": [
        {
          "type": "houseUpgrade",
          "level": 4
        }
      ]
    },
    "unlock_house_capacity": {
      "x": 850,
      "y": 1932,
      "parent": "unlock_house_upgrade_4",
      "size": "medium",
      "cost": {
        "wood": 18,
        "plank": 8,
        "stone": 6
      },
      "requires": "unlock_house_upgrade_4",
      "description": "基础房屋（未升级）每户容纳人数 +1（2→3）",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "houseCapacity"
        },
        {
          "type": "stat",
          "stat": "houseCapacityAdd",
          "op": "add",
          "value": 1
        }
      ]
    },
    "unlock_house_build_discount_v1": {
      "x": 1606,
      "y": 1789,
      "parent": "unlock_house_upgrade_1",
      "size": "small",
      "cost": {
        "plank": 12,
        "stone": 10
      },
      "requires": "unlock_house_upgrade_1",
      "description": "建造与升级房屋材料消耗 −10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseCostDiscount",
          "op": "add",
          "value": 0.1,
          "series": "unlock_house_build_discount"
        }
      ]
    },
    "unlock_house_build_discount_v2": {
      "x": 1488,
      "y": 2184,
      "parent": "unlock_house_upgrade_2",
      "size": "small",
      "cost": {
        "brick": 15,
        "stone_slab": 8
      },
      "requires": "unlock_house_upgrade_2",
      "description": "建造与升级房屋材料消耗 −10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseCostDiscount",
          "op": "add",
          "value": 0.1,
          "series": "unlock_house_build_discount"
        }
      ]
    },
    "unlock_house_build_discount_v3": {
      "x": 1300,
      "y": 1783,
      "parent": "unlock_house_upgrade_3",
      "size": "small",
      "cost": {
        "brick": 25,
        "iron_ingot": 5,
        "lime": 8
      },
      "requires": "unlock_house_upgrade_3",
      "description": "建造与升级房屋材料消耗 −10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseCostDiscount",
          "op": "add",
          "value": 0.1,
          "series": "unlock_house_build_discount"
        }
      ]
    },
    "unlock_house_work_speed_v1": {
      "x": 1761,
      "y": 1789,
      "parent": "unlock_house_upgrade_1",
      "size": "small",
      "cost": {
        "wood": 20,
        "plank": 10
      },
      "requires": "unlock_house_upgrade_1",
      "description": "房屋建造/升级所需进度 −2（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseOrderReduce",
          "op": "add",
          "value": 2,
          "series": "unlock_house_work_speed"
        }
      ]
    },
    "unlock_house_work_speed_v2": {
      "x": 1321,
      "y": 2184,
      "parent": "unlock_house_upgrade_2",
      "size": "small",
      "cost": {
        "wood": 30,
        "plank": 15,
        "stone": 10
      },
      "requires": "unlock_house_upgrade_2",
      "description": "房屋建造/升级所需进度 −2（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseOrderReduce",
          "op": "add",
          "value": 2,
          "series": "unlock_house_work_speed"
        }
      ]
    },
    "unlock_house_work_speed_v3": {
      "x": 1146,
      "y": 1783,
      "parent": "unlock_house_upgrade_3",
      "size": "small",
      "cost": {
        "plank": 25,
        "stone_slab": 12
      },
      "requires": "unlock_house_upgrade_3",
      "description": "房屋建造/升级所需进度 −2（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseOrderReduce",
          "op": "add",
          "value": 2,
          "series": "unlock_house_work_speed"
        }
      ]
    },
    "unlock_house_work_speed_v4": {
      "x": 968,
      "y": 2157,
      "parent": "unlock_house_upgrade_4",
      "size": "small",
      "cost": {
        "brick": 20,
        "pitch": 8
      },
      "requires": "unlock_house_upgrade_4",
      "description": "房屋建造/升级所需进度 −2（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseOrderReduce",
          "op": "add",
          "value": 2,
          "series": "unlock_house_work_speed"
        }
      ]
    },
    "unlock_house_work_speed_v5": {
      "x": 776,
      "y": 1786,
      "parent": "unlock_house_capacity",
      "size": "small",
      "cost": {
        "iron_ingot": 8,
        "gear": 3
      },
      "requires": "unlock_house_capacity",
      "description": "房屋建造/升级所需进度 −2（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "houseOrderReduce",
          "op": "add",
          "value": 2,
          "series": "unlock_house_work_speed"
        }
      ]
    },
    "unlock_tool_crafting": {
      "x": 2400,
      "y": 2000,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {},
      "requires": "unlock_workbench",
      "description": "开局已解锁。工具体系入口（耐久/效率科技前置）；各级工具与武器需单独解锁对应科技",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_tools_lv1": {
      "x": 2601,
      "y": 1703,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {},
      "requires": "unlock_tool_crafting",
      "description": "解锁木质采集工具制作（斧/镐/铲）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_tools_lv2": {
      "x": 2771,
      "y": 1703,
      "parent": "unlock_tools_lv1",
      "size": "medium",
      "cost": {
        "stone": 12,
        "plank": 6
      },
      "requires": "unlock_tools_lv1",
      "description": "解锁石质采集工具制作（斧/镐/铲）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_tools_lv3": {
      "x": 2944,
      "y": 1705,
      "parent": "unlock_tools_lv2",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "plank": 10
      },
      "requires": "unlock_tools_lv2",
      "description": "解锁铁质采集工具制作（斧/镐/铲）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_tools_lv4": {
      "x": 3127,
      "y": 1703,
      "parent": "unlock_tools_lv3",
      "size": "medium",
      "cost": {
        "steel": 2,
        "plank": 12
      },
      "requires": "unlock_tools_lv3",
      "description": "解锁钢质采集工具制作（斧/镐/铲）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_weapons_lv1": {
      "x": 2601,
      "y": 2288,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {},
      "requires": "unlock_tool_crafting",
      "description": "解锁木质武器与护甲制作（剑/矛/弓/弩/盾/甲）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_weapons_lv2": {
      "x": 2773,
      "y": 2289,
      "parent": "unlock_weapons_lv1",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "plank": 8
      },
      "requires": "unlock_weapons_lv1",
      "description": "解锁石质武器与护甲制作",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_weapons_lv3": {
      "x": 2944,
      "y": 2288,
      "parent": "unlock_weapons_lv2",
      "size": "medium",
      "cost": {
        "iron_ingot": 6,
        "plank": 10
      },
      "requires": "unlock_weapons_lv2",
      "description": "解锁铁质武器与护甲制作",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_weapons_lv4": {
      "x": 3127,
      "y": 2287,
      "parent": "unlock_weapons_lv3",
      "size": "medium",
      "cost": {
        "steel": 3,
        "plank": 12
      },
      "requires": "unlock_weapons_lv3",
      "description": "解锁钢质武器与护甲制作",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_farm": {
      "x": 2010,
      "y": 1438,
      "parent": "unlock_food_gather_speed_v1",
      "size": "medium",
      "cost": {
        "wood": 20,
        "clay": 15,
        "brick": 8,
        "food": 10
      },
      "requires": "unlock_food_gather_speed_v1",
      "description": "解锁农场（每座最多 4 人，可再建多座叠加上限）。单座满员约供 25 人一天口粮",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "farm"
        }
      ]
    },
    "unlock_food_gather_speed_v1": {
      "x": 2010,
      "y": 1638,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "food": 20,
        "wood": 12,
        "plank": 6
      },
      "requires": "unlock_click_power",
      "description": "所有食物采集点（浆果丛/农场/牧场）每人效率 +0.01/秒（最高 3 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "foodGatherSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_food_gather_speed"
        }
      ]
    },
    "unlock_food_gather_speed_v2": {
      "x": 2010,
      "y": 1238,
      "parent": "unlock_farm",
      "size": "medium",
      "cost": {
        "food": 35,
        "plank": 12,
        "brick": 8
      },
      "requires": "unlock_farm",
      "description": "所有食物采集点（浆果丛/农场/牧场）每人效率 +0.01/秒（最高 3 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "foodGatherSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_food_gather_speed"
        }
      ]
    },
    "unlock_food_gather_speed_v3": {
      "x": 2010,
      "y": 838,
      "parent": "unlock_pasture",
      "size": "medium",
      "cost": {
        "food": 55,
        "brick": 12,
        "glass": 6
      },
      "requires": "unlock_pasture",
      "description": "所有食物采集点（浆果丛/农场/牧场）每人效率 +0.01/秒（最高 3 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "foodGatherSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_food_gather_speed"
        }
      ]
    },
    "unlock_breed_saving_v1": {
      "x": 1684,
      "y": 1789,
      "parent": "unlock_house_upgrade_1",
      "size": "small",
      "cost": {
        "food": 25,
        "wood": 10
      },
      "requires": "unlock_house_upgrade_1",
      "description": "每次繁殖消耗食物 −1（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "breedFoodSave",
          "op": "add",
          "value": 1,
          "series": "unlock_breed_saving"
        }
      ]
    },
    "unlock_breed_saving_v2": {
      "x": 1404,
      "y": 2184,
      "parent": "unlock_house_upgrade_2",
      "size": "small",
      "cost": {
        "food": 40,
        "plank": 15
      },
      "requires": "unlock_house_upgrade_2",
      "description": "每次繁殖消耗食物 −1（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "breedFoodSave",
          "op": "add",
          "value": 1,
          "series": "unlock_breed_saving"
        }
      ]
    },
    "unlock_breed_saving_v3": {
      "x": 1223,
      "y": 1783,
      "parent": "unlock_house_upgrade_3",
      "size": "small",
      "cost": {
        "food": 60,
        "brick": 12
      },
      "requires": "unlock_house_upgrade_3",
      "description": "每次繁殖消耗食物 −1（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "breedFoodSave",
          "op": "add",
          "value": 1,
          "series": "unlock_breed_saving"
        }
      ]
    },
    "unlock_breed_saving_v4": {
      "x": 1045,
      "y": 2157,
      "parent": "unlock_house_upgrade_4",
      "size": "small",
      "cost": {
        "food": 90,
        "glass": 10,
        "copper_ingot": 5
      },
      "requires": "unlock_house_upgrade_4",
      "description": "每次繁殖消耗食物 −1（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "breedFoodSave",
          "op": "add",
          "value": 1,
          "series": "unlock_breed_saving"
        }
      ]
    },
    "unlock_breed_saving_v5": {
      "x": 852,
      "y": 1786,
      "parent": "unlock_house_capacity",
      "size": "small",
      "cost": {
        "food": 120,
        "wood": 4,
        "glass": 12
      },
      "requires": "unlock_house_capacity",
      "description": "每次繁殖消耗食物 −1（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "breedFoodSave",
          "op": "add",
          "value": 1,
          "series": "unlock_breed_saving"
        }
      ]
    },
    "unlock_pasture": {
      "x": 2010,
      "y": 1038,
      "parent": "unlock_food_gather_speed_v2",
      "size": "medium",
      "cost": {
        "brick": 18,
        "plank": 20,
        "glass": 8,
        "food": 30
      },
      "requires": "unlock_food_gather_speed_v2",
      "description": "解锁牧场（每座最多 8 人，可再建多座叠加上限）。单座 4 人约供 40，满员约 80",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "pasture"
        }
      ]
    },
    "unlock_auto_click": {
      "x": 2222,
      "y": 1813,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "wood": 5
      },
      "requires": "unlock_click_power",
      "maxRepeat": 10,
      "repeatCosts": [
        {
          "wood": 5
        },
        {
          "plank": 2,
          "stone": 8
        },
        {
          "stone_slab": 3,
          "clay": 11
        },
        {
          "brick": 4,
          "gravel": 14
        },
        {
          "glass": 5,
          "resin": 17
        },
        {
          "pitch": 6
        },
        {
          "stone": 25,
          "clay": 25
        },
        {
          "stone_slab": 15,
          "copper_ore": 25
        },
        {
          "iron_ingot": 15,
          "gear": 10
        },
        {
          "lime": 15
        }
      ],
      "levelEffects": [
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
          "effects": [
            {
              "type": "stat",
              "stat": "holdClickLevel",
              "op": "add",
              "value": 1
            }
          ]
        }
      ],
      "description": "按住鼠标自动点击，每次升级减少按住冷却（默认1秒/次，满级0.2秒/次）",
      "effects": [
        {
          "type": "stat",
          "stat": "holdClickLevel",
          "op": "add",
          "value": 1
        }
      ]
    },
    "unlock_click_power": {
      "x": 2003,
      "y": 1804,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 10
      },
      "requires": "unlock_workbench",
      "maxRepeat": 4,
      "repeatCosts": [
        {
          "wood": 10
        },
        {
          "plank": 5,
          "stone": 15,
          "clay": 15
        },
        {
          "stone_slab": 10,
          "brick": 10,
          "gravel": 20
        },
        {
          "glass": 15,
          "stone_slab": 15,
          "brick": 15,
          "plank": 15
        }
      ],
      "levelEffects": [
        {
          "description": "提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击",
          "effects": [
            {
              "type": "stat",
              "stat": "clickPowerAdd",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击",
          "effects": [
            {
              "type": "stat",
              "stat": "clickPowerAdd",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击",
          "effects": [
            {
              "type": "stat",
              "stat": "clickPowerAdd",
              "op": "add",
              "value": 1
            }
          ]
        },
        {
          "description": "提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击",
          "effects": [
            {
              "type": "stat",
              "stat": "clickPowerAdd",
              "op": "add",
              "value": 1
            }
          ]
        }
      ],
      "description": "提升手动点击效率：每级 +1 进度/次（共 4 级）。工具不再影响点击",
      "effects": [
        {
          "type": "stat",
          "stat": "clickPowerAdd",
          "op": "add",
          "value": 1
        }
      ]
    },
    "unlock_tool_durability_v1": {
      "x": 2712,
      "y": 2001,
      "parent": "unlock_efficient_repair_v1",
      "size": "small",
      "parents": [
        "unlock_efficient_repair_v1",
        "unlock_tool_efficiency_v1"
      ],
      "cost": {
        "wood": 10,
        "stone": 10,
        "gravel": 10,
        "clay": 10,
        "resin": 10
      },
      "requires": [
        "unlock_efficient_repair_v1",
        "unlock_tool_efficiency_v1"
      ],
      "description": "所有工具和武器耐久 +10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolDurabilityMultAdd",
          "op": "add",
          "value": 0.1,
          "series": "unlock_tool_durability"
        }
      ]
    },
    "unlock_tool_durability_v2": {
      "x": 2870,
      "y": 2002,
      "parent": "unlock_efficient_repair_v2",
      "size": "small",
      "parents": [
        "unlock_efficient_repair_v2",
        "unlock_tool_efficiency_v2"
      ],
      "cost": {
        "plank": 12,
        "stone": 14,
        "clay": 12,
        "gravel": 10
      },
      "requires": [
        "unlock_efficient_repair_v2",
        "unlock_tool_efficiency_v2"
      ],
      "description": "所有工具和武器耐久 +10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolDurabilityMultAdd",
          "op": "add",
          "value": 0.1,
          "series": "unlock_tool_durability"
        }
      ]
    },
    "unlock_tool_durability_v3": {
      "x": 3030,
      "y": 2001,
      "parent": "unlock_efficient_repair_v3",
      "size": "small",
      "parents": [
        "unlock_efficient_repair_v3",
        "unlock_tool_efficiency_v3"
      ],
      "cost": {
        "plank": 10,
        "stone_slab": 8,
        "brick": 6,
        "resin": 8
      },
      "requires": [
        "unlock_efficient_repair_v3",
        "unlock_tool_efficiency_v3"
      ],
      "description": "所有工具和武器耐久 +10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolDurabilityMultAdd",
          "op": "add",
          "value": 0.1,
          "series": "unlock_tool_durability"
        }
      ]
    },
    "unlock_tool_durability_v4": {
      "x": 3201,
      "y": 2001,
      "parent": "unlock_efficient_repair_v4",
      "size": "small",
      "parents": [
        "unlock_efficient_repair_v4",
        "unlock_tool_efficiency_v4"
      ],
      "cost": {
        "stone_slab": 10,
        "glass": 8,
        "brick": 10,
        "pitch": 4
      },
      "requires": [
        "unlock_efficient_repair_v4",
        "unlock_tool_efficiency_v4"
      ],
      "description": "所有工具和武器耐久 +10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolDurabilityMultAdd",
          "op": "add",
          "value": 0.1,
          "series": "unlock_tool_durability"
        }
      ]
    },
    "unlock_tool_durability_v5": {
      "x": 3380,
      "y": 2001,
      "parent": "unlock_tool_durability_v4",
      "size": "small",
      "cost": {
        "plank": 10,
        "stone_slab": 10,
        "glass": 10,
        "brick": 10,
        "wood": 10,
        "copper_ingot": 5
      },
      "requires": "unlock_tool_durability_v4",
      "description": "所有工具和武器耐久 +10%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolDurabilityMultAdd",
          "op": "add",
          "value": 0.1,
          "series": "unlock_tool_durability"
        }
      ]
    },
    "unlock_tool_efficiency_v1": {
      "x": 2679,
      "y": 1865,
      "parent": "unlock_tools_lv1",
      "size": "small",
      "cost": {
        "plank": 14,
        "stone_slab": 10,
        "clay": 8
      },
      "requires": "unlock_tools_lv1",
      "description": "所有工具提供的采集效率 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolGatherMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_tool_efficiency"
        }
      ]
    },
    "unlock_tool_efficiency_v2": {
      "x": 2845,
      "y": 1865,
      "parent": "unlock_tools_lv2",
      "size": "small",
      "cost": {
        "plank": 18,
        "brick": 8,
        "gravel": 12
      },
      "requires": "unlock_tools_lv2",
      "description": "所有工具提供的采集效率 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolGatherMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_tool_efficiency"
        }
      ]
    },
    "unlock_tool_efficiency_v3": {
      "x": 3014,
      "y": 1865,
      "parent": "unlock_tools_lv3",
      "size": "small",
      "cost": {
        "stone_slab": 12,
        "brick": 10,
        "pitch": 4
      },
      "requires": "unlock_tools_lv3",
      "description": "所有工具提供的采集效率 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolGatherMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_tool_efficiency"
        }
      ]
    },
    "unlock_tool_efficiency_v4": {
      "x": 3192,
      "y": 1865,
      "parent": "unlock_tools_lv4",
      "size": "small",
      "cost": {
        "brick": 14,
        "copper_ingot": 4,
        "glass": 8
      },
      "requires": "unlock_tools_lv4",
      "description": "所有工具提供的采集效率 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolGatherMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_tool_efficiency"
        }
      ]
    },
    "unlock_tool_efficiency_v5": {
      "x": 3380,
      "y": 1865,
      "parent": "unlock_tool_efficiency_v4",
      "size": "small",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "pitch": 6
      },
      "requires": "unlock_tool_efficiency_v4",
      "description": "所有工具提供的采集效率 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "toolGatherMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_tool_efficiency"
        }
      ]
    },
    "unlock_efficient_repair_v1": {
      "x": 2687,
      "y": 2124,
      "parent": "unlock_weapons_lv1",
      "size": "small",
      "cost": {
        "wood": 12,
        "plank": 6
      },
      "requires": "unlock_weapons_lv1",
      "description": "工具/武器维修费用 −6%（可叠加；满级时近毁装备约需造价的 20%）",
      "effects": [
        {
          "type": "stat",
          "stat": "repairCostReduce",
          "op": "add",
          "value": 0.06,
          "series": "unlock_efficient_repair"
        }
      ]
    },
    "unlock_efficient_repair_v2": {
      "x": 2851,
      "y": 2124,
      "parent": "unlock_weapons_lv2",
      "size": "small",
      "cost": {
        "plank": 12,
        "stone": 10
      },
      "requires": "unlock_weapons_lv2",
      "description": "工具/武器维修费用 −6%（可叠加；满级时近毁装备约需造价的 20%）",
      "effects": [
        {
          "type": "stat",
          "stat": "repairCostReduce",
          "op": "add",
          "value": 0.06,
          "series": "unlock_efficient_repair"
        }
      ]
    },
    "unlock_efficient_repair_v3": {
      "x": 3018,
      "y": 2124,
      "parent": "unlock_weapons_lv3",
      "size": "small",
      "cost": {
        "stone_slab": 8,
        "plank": 14
      },
      "requires": "unlock_weapons_lv3",
      "description": "工具/武器维修费用 −6%（可叠加；满级时近毁装备约需造价的 20%）",
      "effects": [
        {
          "type": "stat",
          "stat": "repairCostReduce",
          "op": "add",
          "value": 0.06,
          "series": "unlock_efficient_repair"
        }
      ]
    },
    "unlock_efficient_repair_v4": {
      "x": 3194,
      "y": 2124,
      "parent": "unlock_weapons_lv4",
      "size": "small",
      "cost": {
        "brick": 10,
        "pitch": 5
      },
      "requires": "unlock_weapons_lv4",
      "description": "工具/武器维修费用 −6%（可叠加；满级时近毁装备约需造价的 20%）",
      "effects": [
        {
          "type": "stat",
          "stat": "repairCostReduce",
          "op": "add",
          "value": 0.06,
          "series": "unlock_efficient_repair"
        }
      ]
    },
    "unlock_efficient_repair_v5": {
      "x": 3380,
      "y": 2124,
      "parent": "unlock_efficient_repair_v4",
      "size": "small",
      "cost": {
        "iron_ingot": 4,
        "glass": 6,
        "plank": 10
      },
      "requires": "unlock_efficient_repair_v4",
      "description": "工具/武器维修费用 −6%（可叠加；满级时近毁装备约需造价的 20%）",
      "effects": [
        {
          "type": "stat",
          "stat": "repairCostReduce",
          "op": "add",
          "value": 0.06,
          "series": "unlock_efficient_repair"
        }
      ]
    },
    "unlock_quarry": {
      "x": 4292,
      "y": 1943,
      "parent": "unlock_forest",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 5
      },
      "requires": "unlock_forest",
      "description": "解锁采石场资源点",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "quarry"
        }
      ]
    },
    "unlock_clay_pit": {
      "x": 4292,
      "y": 2343,
      "parent": "unlock_forest",
      "size": "medium",
      "cost": {
        "wood": 10,
        "plank": 3
      },
      "requires": "unlock_forest",
      "description": "解锁黏土坑资源点（前期资源，与石头同级）",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "clay_pit"
        }
      ]
    },
    "unlock_gravel": {
      "x": 4492,
      "y": 2143,
      "parent": "unlock_forest",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 4,
        "stone": 6
      },
      "requires": "unlock_forest",
      "description": "解锁砂砾滩（低级资源点，铲子采集）",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "gravel_bed"
        }
      ]
    },
    "unlock_resin": {
      "x": 4700,
      "y": 2139,
      "parent": "unlock_gravel",
      "size": "medium",
      "cost": {
        "wood": 14,
        "stone": 6
      },
      "requires": "unlock_gravel",
      "description": "解锁松脂林（低级），斧头采集树脂",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "resin_grove"
        }
      ]
    },
    "unlock_pitch": {
      "x": 3289,
      "y": 3649,
      "parent": "unlock_brick_craft",
      "size": "medium",
      "cost": {
        "resin": 12,
        "wood": 8
      },
      "requires": "unlock_brick_craft",
      "description": "解锁松香配方（3树脂→1松香），用于齿轮等合成",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_pitch"
        }
      ]
    },
    "unlock_brick_craft": {
      "x": 3027,
      "y": 3391,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {},
      "requires": "unlock_furnace",
      "description": "解锁砖配方，在合成页安排生产（5黏土→1砖）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_brick"
        }
      ]
    },
    "unlock_stone_slab": {
      "x": 2483,
      "y": 2640,
      "parent": "unlock_plank_craft",
      "size": "medium",
      "cost": {
        "stone": 10
      },
      "requires": "unlock_plank_craft",
      "description": "解锁石板配方（4石头→1石板）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_stone_slab"
        }
      ]
    },
    "unlock_iron_smelt": {
      "x": 3604,
      "y": 3222,
      "parent": null,
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 16,
        "coal": 6
      },
      "description": "解锁铁锭冶炼（3铁矿+1煤炭→1铁锭，需熔炉）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "smelt_iron"
        }
      ]
    },
    "unlock_steel_smelt": {
      "x": 3668,
      "y": 3383,
      "parent": null,
      "size": "medium",
      "cost": {
        "iron_ingot": 8,
        "coal": 10,
        "brick": 10
      },
      "description": "解锁钢锭冶炼（2铁锭+2煤炭→1钢锭，需高级熔炉）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "smelt_steel"
        }
      ]
    },
    "unlock_treasure_chest": {
      "x": -971,
      "y": 1824,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {},
      "requires": "unlock_altar",
      "description": "开局已解锁。砍够木头后会固定掉落引导宝箱；之后采集区资源点有1%概率掉落宝箱（觅食除外）",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "treasure_chest"
        },
        {
          "type": "onUnlock",
          "action": "revealStarterChest"
        }
      ]
    },
    "unlock_advanced_workbench": {
      "x": 3029,
      "y": 3651,
      "parent": "unlock_brick_craft",
      "size": "medium",
      "cost": {
        "brick": 12,
        "limestone": 10,
        "plank": 15,
        "stone_slab": 10,
        "gravel": 8
      },
      "requires": "unlock_brick_craft",
      "description": "解锁更高级的合成配方与熔炉前置（需砖块与石灰岩等中级材料）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_craft_efficiency_v1": {
      "x": 1740,
      "y": 2520,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 6
      },
      "requires": "unlock_workbench",
      "description": "生产订单效率 +0.02/人/秒（可叠加，最高 5 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "craftSpeedAdd",
          "op": "add",
          "value": 0.02,
          "series": "unlock_craft_efficiency"
        }
      ]
    },
    "unlock_craft_efficiency_v2": {
      "x": 1480,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      },
      "requires": "unlock_craft_efficiency_v1",
      "description": "生产订单效率 +0.02/人/秒（可叠加，最高 5 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "craftSpeedAdd",
          "op": "add",
          "value": 0.02,
          "series": "unlock_craft_efficiency"
        }
      ]
    },
    "unlock_craft_efficiency_v3": {
      "x": 1220,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "brick": 6
      },
      "requires": "unlock_craft_efficiency_v2",
      "description": "生产订单效率 +0.02/人/秒（可叠加，最高 5 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "craftSpeedAdd",
          "op": "add",
          "value": 0.02,
          "series": "unlock_craft_efficiency"
        }
      ]
    },
    "unlock_craft_efficiency_v4": {
      "x": 960,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v3",
      "size": "medium",
      "cost": {
        "brick": 10,
        "pitch": 4,
        "plank": 10
      },
      "requires": "unlock_craft_efficiency_v3",
      "description": "生产订单效率 +0.02/人/秒（可叠加，最高 5 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "craftSpeedAdd",
          "op": "add",
          "value": 0.02,
          "series": "unlock_craft_efficiency"
        }
      ]
    },
    "unlock_craft_efficiency_v5": {
      "x": 700,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 3,
        "glass": 6,
        "gear": 1
      },
      "requires": "unlock_craft_efficiency_v4",
      "description": "生产订单效率 +0.02/人/秒（可叠加，最高 5 级）",
      "effects": [
        {
          "type": "stat",
          "stat": "craftSpeedAdd",
          "op": "add",
          "value": 0.02,
          "series": "unlock_craft_efficiency"
        }
      ]
    },
    "unlock_furnace": {
      "x": 2847,
      "y": 3105,
      "parent": "unlock_stone_slab",
      "size": "medium",
      "cost": {
        "stone_slab": 16,
        "plank": 5,
        "pitch": 4
      },
      "requires": "unlock_stone_slab",
      "description": "解锁熔炉：可冶炼铜锭（3铜矿+1煤炭）；铁锭/钢锭另需对应冶炼科技",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "smelt_copper"
        }
      ]
    },
    "unlock_copper_mine": {
      "x": 4292,
      "y": 1743,
      "parent": "unlock_quarry",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone_slab": 12,
        "limestone": 8
      },
      "requires": "unlock_quarry",
      "description": "解锁铜矿资源点（中级采矿，需先打通石灰岩产线）",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "copper_mine"
        }
      ]
    },
    "unlock_coal_mine": {
      "x": 4292,
      "y": 2743,
      "parent": "unlock_limestone",
      "size": "medium",
      "cost": {
        "stone_slab": 14,
        "plank": 10,
        "coal": 5
      },
      "requires": "unlock_limestone",
      "description": "解锁煤矿资源点",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "coal_mine"
        },
        {
          "type": "unlockRecipe",
          "recipeId": "craft_coke"
        }
      ]
    },
    "unlock_iron_mine": {
      "x": 4292,
      "y": 1543,
      "parent": "unlock_copper_mine",
      "size": "medium",
      "cost": {
        "plank": 16,
        "stone": 12,
        "copper_ore": 10
      },
      "requires": "unlock_copper_mine",
      "description": "解锁铁矿（中级），产出铁矿石；熔炉可冶炼铁锭",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "iron_mine"
        }
      ]
    },
    "unlock_limestone": {
      "x": 4292,
      "y": 2543,
      "parent": "unlock_clay_pit",
      "size": "medium",
      "cost": {
        "stone": 16,
        "plank": 10,
        "gravel": 12
      },
      "requires": "unlock_clay_pit",
      "description": "解锁石灰石采集（中级）",
      "effects": [
        {
          "type": "unlockPoint",
          "pointId": "limestone_quarry"
        }
      ]
    },
    "unlock_lime_craft": {
      "x": 3383,
      "y": 3008,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {
        "limestone": 12,
        "coal": 5,
        "brick": 6
      },
      "requires": "unlock_furnace",
      "description": "解锁石灰配方（4石灰石→1石灰，需已有熔炉）",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_lime"
        },
        {
          "type": "unlockRecipe",
          "recipeId": "craft_glass"
        }
      ]
    },
    "unlock_gear_craft": {
      "x": 3216,
      "y": 3180,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {
        "copper_ingot": 8,
        "pitch": 6
      },
      "requires": "unlock_furnace",
      "description": "解锁齿轮配方，在合成页安排生产",
      "effects": [
        {
          "type": "unlockRecipe",
          "recipeId": "craft_gear"
        }
      ]
    },
    "unlock_defense_training": {
      "x": 1358,
      "y": 3268,
      "parent": null,
      "size": "medium",
      "cost": {
        "gear": 4,
        "plank": 20,
        "copper_ingot": 5
      },
      "description": "开启防务强化科技线（生命/攻击/攻速/坚韧皮肤）",
      "effects": [
        {
          "type": "prereqOnly"
        }
      ]
    },
    "unlock_combat_hp_v1": {
      "x": 1358,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "food": 30,
        "plank": 15
      },
      "requires": "unlock_defense_training",
      "description": "友军生命 +8%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatHpMultAdd",
          "op": "add",
          "value": 0.08,
          "series": "unlock_combat_hp"
        }
      ]
    },
    "unlock_combat_hp_v2": {
      "x": 1359,
      "y": 3498,
      "parent": "unlock_combat_hp_v1",
      "size": "medium",
      "cost": {
        "food": 45,
        "brick": 12,
        "stone_slab": 10
      },
      "requires": "unlock_combat_hp_v1",
      "description": "友军生命 +8%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatHpMultAdd",
          "op": "add",
          "value": 0.08,
          "series": "unlock_combat_hp"
        }
      ]
    },
    "unlock_combat_hp_v3": {
      "x": 1358,
      "y": 3637,
      "parent": "unlock_combat_hp_v2",
      "size": "medium",
      "cost": {
        "food": 60,
        "iron_ingot": 6,
        "bronze": 8
      },
      "requires": "unlock_combat_hp_v2",
      "description": "友军生命 +8%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatHpMultAdd",
          "op": "add",
          "value": 0.08,
          "series": "unlock_combat_hp"
        }
      ]
    },
    "unlock_combat_hp_v4": {
      "x": 1355,
      "y": 3778,
      "parent": "unlock_combat_hp_v3",
      "size": "medium",
      "cost": {
        "food": 80,
        "steel": 4,
        "lime": 12
      },
      "requires": "unlock_combat_hp_v3",
      "description": "友军生命 +8%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatHpMultAdd",
          "op": "add",
          "value": 0.08,
          "series": "unlock_combat_hp"
        }
      ]
    },
    "unlock_combat_hp_v5": {
      "x": 1359,
      "y": 3917,
      "parent": "unlock_combat_hp_v4",
      "size": "medium",
      "cost": {
        "food": 100,
        "steel": 8,
        "silver_ingot": 4
      },
      "requires": "unlock_combat_hp_v4",
      "description": "友军生命 +8%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatHpMultAdd",
          "op": "add",
          "value": 0.08,
          "series": "unlock_combat_hp"
        }
      ]
    },
    "unlock_combat_atk_v1": {
      "x": 1578,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "copper_ingot": 6,
        "stone_slab": 10
      },
      "requires": "unlock_defense_training",
      "description": "友军攻击 +6%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAtkMultAdd",
          "op": "add",
          "value": 0.06,
          "series": "unlock_combat_atk"
        }
      ]
    },
    "unlock_combat_atk_v2": {
      "x": 1799,
      "y": 3495,
      "parent": "unlock_combat_atk_v1",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "bronze": 8
      },
      "requires": "unlock_combat_atk_v1",
      "description": "友军攻击 +6%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAtkMultAdd",
          "op": "add",
          "value": 0.06,
          "series": "unlock_combat_atk"
        }
      ]
    },
    "unlock_combat_atk_v3": {
      "x": 2018,
      "y": 3634,
      "parent": "unlock_combat_atk_v2",
      "size": "medium",
      "cost": {
        "iron_ingot": 10,
        "gear": 4
      },
      "requires": "unlock_combat_atk_v2",
      "description": "友军攻击 +6%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAtkMultAdd",
          "op": "add",
          "value": 0.06,
          "series": "unlock_combat_atk"
        }
      ]
    },
    "unlock_combat_atk_v4": {
      "x": 2238,
      "y": 3777,
      "parent": "unlock_combat_atk_v3",
      "size": "medium",
      "cost": {
        "steel": 6,
        "pitch": 10
      },
      "requires": "unlock_combat_atk_v3",
      "description": "友军攻击 +6%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAtkMultAdd",
          "op": "add",
          "value": 0.06,
          "series": "unlock_combat_atk"
        }
      ]
    },
    "unlock_combat_atk_v5": {
      "x": 2458,
      "y": 3917,
      "parent": "unlock_combat_atk_v4",
      "size": "medium",
      "cost": {
        "steel": 10,
        "gold_ingot": 3
      },
      "requires": "unlock_combat_atk_v4",
      "description": "友军攻击 +6%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAtkMultAdd",
          "op": "add",
          "value": 0.06,
          "series": "unlock_combat_atk"
        }
      ]
    },
    "unlock_combat_aspd_v1": {
      "x": 1138,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "resin": 10,
        "plank": 12
      },
      "requires": "unlock_defense_training",
      "description": "友军攻速 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAspdMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_combat_aspd"
        }
      ]
    },
    "unlock_combat_aspd_v2": {
      "x": 920,
      "y": 3496,
      "parent": "unlock_combat_aspd_v1",
      "size": "medium",
      "cost": {
        "pitch": 8,
        "plank": 18
      },
      "requires": "unlock_combat_aspd_v1",
      "description": "友军攻速 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAspdMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_combat_aspd"
        }
      ]
    },
    "unlock_combat_aspd_v3": {
      "x": 700,
      "y": 3638,
      "parent": "unlock_combat_aspd_v2",
      "size": "medium",
      "cost": {
        "pitch": 12,
        "gear": 3
      },
      "requires": "unlock_combat_aspd_v2",
      "description": "友军攻速 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAspdMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_combat_aspd"
        }
      ]
    },
    "unlock_combat_aspd_v4": {
      "x": 477,
      "y": 3776,
      "parent": "unlock_combat_aspd_v3",
      "size": "medium",
      "cost": {
        "gear": 6,
        "iron_ingot": 4
      },
      "requires": "unlock_combat_aspd_v3",
      "description": "友军攻速 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAspdMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_combat_aspd"
        }
      ]
    },
    "unlock_combat_aspd_v5": {
      "x": 258,
      "y": 3917,
      "parent": "unlock_combat_aspd_v4",
      "size": "medium",
      "cost": {
        "gear": 10,
        "steel": 4
      },
      "requires": "unlock_combat_aspd_v4",
      "description": "友军攻速 +5%（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "combatAspdMultAdd",
          "op": "add",
          "value": 0.05,
          "series": "unlock_combat_aspd"
        }
      ]
    },
    "unlock_tough_skin": {
      "x": 915,
      "y": 3356,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "food": 40,
        "resin": 12,
        "copper_ingot": 6
      },
      "requires": "unlock_defense_training",
      "description": "所有己方单位固定减伤 +1（仅一级）",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "toughSkin"
        },
        {
          "type": "stat",
          "stat": "toughSkinFlatDr",
          "op": "add",
          "value": 1
        }
      ]
    },
    "unlock_gate_lv2": {
      "x": 2566,
      "y": 3274,
      "parent": null,
      "size": "medium",
      "cost": {
        "plank": 15,
        "stone": 20
      },
      "description": "城门升级为石板门（耐久360，减伤45%）",
      "effects": [
        {
          "type": "gateLevel",
          "level": 2
        }
      ]
    },
    "unlock_gate_lv3": {
      "x": 2306,
      "y": 3274,
      "parent": "unlock_gate_lv2",
      "size": "medium",
      "cost": {
        "stone_slab": 20,
        "brick": 15,
        "pitch": 6
      },
      "requires": "unlock_gate_lv2",
      "description": "城门升级为砖铁门（耐久560，减伤60%）",
      "effects": [
        {
          "type": "gateLevel",
          "level": 3
        }
      ]
    },
    "unlock_gate_lv4": {
      "x": 2046,
      "y": 3272,
      "parent": "unlock_gate_lv3",
      "size": "medium",
      "cost": {
        "brick": 25,
        "iron_ingot": 12,
        "lime": 10
      },
      "requires": "unlock_gate_lv3",
      "description": "城门升级为精钢门（耐久840，减伤70%）",
      "effects": [
        {
          "type": "gateLevel",
          "level": 4
        }
      ]
    },
    "unlock_gate_repair_speed_v1": {
      "x": 2566,
      "y": 3534,
      "parent": "unlock_gate_lv2",
      "size": "medium",
      "cost": {
        "brick": 12,
        "plank": 16,
        "stone": 10
      },
      "requires": "unlock_gate_lv2",
      "description": "修门队效率 +25%（每名村民每10秒基础修复2点耐久，可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "gateRepairMultAdd",
          "op": "add",
          "value": 0.25,
          "series": "unlock_gate_repair_speed"
        }
      ]
    },
    "unlock_gate_repair_speed_v2": {
      "x": 2306,
      "y": 3534,
      "parent": "unlock_gate_repair_speed_v1",
      "size": "medium",
      "cost": {
        "brick": 18,
        "iron_ingot": 4,
        "pitch": 6
      },
      "requires": "unlock_gate_repair_speed_v1",
      "description": "修门队效率 +25%（每名村民每10秒基础修复2点耐久，可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "gateRepairMultAdd",
          "op": "add",
          "value": 0.25,
          "series": "unlock_gate_repair_speed"
        }
      ]
    },
    "unlock_gate_repair_speed_v3": {
      "x": 2046,
      "y": 3534,
      "parent": "unlock_gate_repair_speed_v2",
      "size": "medium",
      "cost": {
        "iron_ingot": 8,
        "lime": 8,
        "gear": 2
      },
      "requires": "unlock_gate_repair_speed_v2",
      "description": "修门队效率 +25%（每名村民每10秒基础修复2点耐久，可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "gateRepairMultAdd",
          "op": "add",
          "value": 0.25,
          "series": "unlock_gate_repair_speed"
        }
      ]
    },
    "unlock_gate_repair_speed_v4": {
      "x": 1786,
      "y": 3534,
      "parent": "unlock_gate_repair_speed_v3",
      "size": "medium",
      "cost": {
        "steel": 4,
        "brick": 20,
        "gear": 4
      },
      "requires": "unlock_gate_repair_speed_v3",
      "description": "修门队效率 +25%（每名村民每10秒基础修复2点耐久，可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "gateRepairMultAdd",
          "op": "add",
          "value": 0.25,
          "series": "unlock_gate_repair_speed"
        }
      ]
    },
    "unlock_furnace_upgrade": {
      "x": 3154,
      "y": 3824,
      "parent": null,
      "size": "medium",
      "cost": {
        "iron_ingot": 10,
        "coke": 12,
        "brick": 15
      },
      "description": "升级熔炉：计数值减半，并解锁钢锭冶炼（2铁锭+2煤炭）",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "furnaceUpgrade"
        },
        {
          "type": "stat",
          "stat": "furnaceOrderHalf",
          "op": "add",
          "value": 1
        }
      ]
    },
    "unlock_worker_efficiency_v1": {
      "x": 1529,
      "y": 1789,
      "parent": "unlock_house_upgrade_1",
      "size": "small",
      "cost": {
        "wood": 16,
        "stone": 12,
        "plank": 6
      },
      "requires": "unlock_house_upgrade_1",
      "description": "村民徒手基础效率 +0.01/秒（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "workerSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_worker_efficiency"
        }
      ]
    },
    "unlock_worker_efficiency_v2": {
      "x": 1571,
      "y": 2184,
      "parent": "unlock_house_upgrade_2",
      "size": "small",
      "cost": {
        "plank": 12,
        "stone": 16,
        "food": 20
      },
      "requires": "unlock_house_upgrade_2",
      "description": "村民徒手基础效率 +0.01/秒（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "workerSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_worker_efficiency"
        }
      ]
    },
    "unlock_worker_efficiency_v3": {
      "x": 1377,
      "y": 1783,
      "parent": "unlock_house_upgrade_3",
      "size": "small",
      "cost": {
        "brick": 10,
        "plank": 15,
        "food": 30
      },
      "requires": "unlock_house_upgrade_3",
      "description": "村民徒手基础效率 +0.01/秒（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "workerSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_worker_efficiency"
        }
      ]
    },
    "unlock_worker_efficiency_v4": {
      "x": 1123,
      "y": 2157,
      "parent": "unlock_house_upgrade_4",
      "size": "small",
      "cost": {
        "glass": 8,
        "copper_ingot": 4,
        "food": 40
      },
      "requires": "unlock_house_upgrade_4",
      "description": "村民徒手基础效率 +0.01/秒（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "workerSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_worker_efficiency"
        }
      ]
    },
    "unlock_worker_efficiency_v5": {
      "x": 929,
      "y": 1786,
      "parent": "unlock_house_capacity",
      "size": "small",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "food": 50
      },
      "requires": "unlock_house_capacity",
      "description": "村民徒手基础效率 +0.01/秒（可叠加）",
      "effects": [
        {
          "type": "stat",
          "stat": "workerSpeedAdd",
          "op": "add",
          "value": 0.01,
          "series": "unlock_worker_efficiency"
        }
      ]
    },
    "unlock_point_recovery": {
      "x": 3414,
      "y": 4086,
      "parent": "unlock_furnace_upgrade",
      "size": "medium",
      "cost": {
        "stone": 16,
        "gravel": 12,
        "plank": 10,
        "coal": 8
      },
      "requires": "unlock_furnace_upgrade",
      "description": "所有资源点恢复时间 −10%",
      "effects": [
        {
          "type": "unlockFlag",
          "flag": "pointRecovery"
        },
        {
          "type": "stat",
          "stat": "pointRecoveryMult",
          "op": "mul",
          "value": 0.9
        }
      ]
    },
    "point_up_forest_count": {
      "x": 4092,
      "y": 1943,
      "parent": "unlock_forest",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "wood": 6
        },
        {
          "wood": 11
        },
        {
          "wood": 17
        },
        {
          "wood": 24
        },
        {
          "wood": 32
        }
      ],
      "cost": {
        "wood": 6
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "forest",
          "upgrade": "count"
        }
      ]
    },
    "point_up_forest_cooldown": {
      "x": 4092,
      "y": 2143,
      "parent": "unlock_forest",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "wood": 7
        },
        {
          "wood": 12
        },
        {
          "wood": 18
        },
        {
          "wood": 25
        },
        {
          "wood": 33
        }
      ],
      "cost": {
        "wood": 7
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "forest",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "forest",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_forest_refine": {
      "x": 3892,
      "y": 1943,
      "parent": "point_up_forest_count",
      "size": "small",
      "parents": [
        "point_up_forest_count",
        "point_up_forest_cooldown"
      ],
      "cost": {
        "wood": 65
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "forest",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_quarry_count": {
      "x": 4492,
      "y": 1743,
      "parent": "unlock_quarry",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "stone": 8
        },
        {
          "stone": 14
        },
        {
          "stone": 21
        },
        {
          "stone": 29
        },
        {
          "stone": 39
        }
      ],
      "cost": {
        "stone": 8
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "quarry",
          "upgrade": "count"
        }
      ]
    },
    "point_up_quarry_cooldown": {
      "x": 4492,
      "y": 1943,
      "parent": "unlock_quarry",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "stone": 9
        },
        {
          "stone": 15
        },
        {
          "stone": 22
        },
        {
          "stone": 30
        },
        {
          "stone": 40
        }
      ],
      "cost": {
        "stone": 9
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "quarry",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "quarry",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_quarry_refine": {
      "x": 4692,
      "y": 1743,
      "parent": "point_up_quarry_count",
      "size": "small",
      "parents": [
        "point_up_quarry_count",
        "point_up_quarry_cooldown"
      ],
      "cost": {
        "stone": 79
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "quarry",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_clay_pit_count": {
      "x": 4091,
      "y": 2543,
      "parent": "unlock_clay_pit",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "clay": 9
        },
        {
          "clay": 16
        },
        {
          "clay": 24
        },
        {
          "clay": 34
        },
        {
          "clay": 45
        }
      ],
      "cost": {
        "clay": 9
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "clay_pit",
          "upgrade": "count"
        }
      ]
    },
    "point_up_clay_pit_cooldown": {
      "x": 4092,
      "y": 2343,
      "parent": "unlock_clay_pit",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "clay": 10
        },
        {
          "clay": 17
        },
        {
          "clay": 26
        },
        {
          "clay": 35
        },
        {
          "clay": 47
        }
      ],
      "cost": {
        "clay": 10
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "clay_pit",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "clay_pit",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_clay_pit_refine": {
      "x": 3892,
      "y": 2543,
      "parent": "point_up_clay_pit_count",
      "size": "small",
      "parents": [
        "point_up_clay_pit_count",
        "point_up_clay_pit_cooldown"
      ],
      "cost": {
        "clay": 92
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "clay_pit",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_copper_mine_count": {
      "x": 4092,
      "y": 1743,
      "parent": "unlock_copper_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "copper_ore": 10
        },
        {
          "copper_ore": 18
        },
        {
          "copper_ore": 28
        },
        {
          "copper_ore": 39
        },
        {
          "copper_ore": 52
        }
      ],
      "cost": {
        "copper_ore": 10
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "copper_mine",
          "upgrade": "count"
        }
      ]
    },
    "point_up_copper_mine_cooldown": {
      "x": 4092,
      "y": 1543,
      "parent": "unlock_copper_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "copper_ore": 12
        },
        {
          "copper_ore": 20
        },
        {
          "copper_ore": 29
        },
        {
          "copper_ore": 40
        },
        {
          "copper_ore": 53
        }
      ],
      "cost": {
        "copper_ore": 12
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "copper_mine",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "copper_mine",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_copper_mine_refine": {
      "x": 3892,
      "y": 1543,
      "parent": "point_up_copper_mine_count",
      "size": "small",
      "parents": [
        "point_up_copper_mine_count",
        "point_up_copper_mine_cooldown"
      ],
      "cost": {
        "copper_ore": 105
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "copper_mine",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_coal_mine_count": {
      "x": 4092,
      "y": 2743,
      "parent": "unlock_coal_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "coal": 12
        },
        {
          "coal": 22
        },
        {
          "coal": 34
        },
        {
          "coal": 48
        },
        {
          "coal": 64
        }
      ],
      "cost": {
        "coal": 12
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "coal_mine",
          "upgrade": "count"
        }
      ]
    },
    "point_up_coal_mine_cooldown": {
      "x": 4092,
      "y": 2943,
      "parent": "unlock_coal_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "coal": 14
        },
        {
          "coal": 24
        },
        {
          "coal": 36
        },
        {
          "coal": 50
        },
        {
          "coal": 66
        }
      ],
      "cost": {
        "coal": 14
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "coal_mine",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "coal_mine",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_coal_mine_refine": {
      "x": 3892,
      "y": 2943,
      "parent": "point_up_coal_mine_count",
      "size": "small",
      "parents": [
        "point_up_coal_mine_count",
        "point_up_coal_mine_cooldown"
      ],
      "cost": {
        "coal": 130
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "coal_mine",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_gravel_bed_count": {
      "x": 4692,
      "y": 2343,
      "parent": "unlock_gravel",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "gravel": 14
        },
        {
          "gravel": 25
        },
        {
          "gravel": 38
        },
        {
          "gravel": 53
        },
        {
          "gravel": 71
        }
      ],
      "cost": {
        "gravel": 14
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "gravel_bed",
          "upgrade": "count"
        }
      ]
    },
    "point_up_gravel_bed_cooldown": {
      "x": 4492,
      "y": 2343,
      "parent": "unlock_gravel",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "gravel": 16
        },
        {
          "gravel": 27
        },
        {
          "gravel": 40
        },
        {
          "gravel": 56
        },
        {
          "gravel": 73
        }
      ],
      "cost": {
        "gravel": 16
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "gravel_bed",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "gravel_bed",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_gravel_bed_refine": {
      "x": 4692,
      "y": 2543,
      "parent": "point_up_gravel_bed_count",
      "size": "small",
      "parents": [
        "point_up_gravel_bed_count",
        "point_up_gravel_bed_cooldown"
      ],
      "cost": {
        "gravel": 144
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "gravel_bed",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_limestone_quarry_count": {
      "x": 4492,
      "y": 2543,
      "parent": "unlock_limestone",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "limestone": 16
        },
        {
          "limestone": 29
        },
        {
          "limestone": 45
        },
        {
          "limestone": 63
        },
        {
          "limestone": 84
        }
      ],
      "cost": {
        "limestone": 16
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "limestone_quarry",
          "upgrade": "count"
        }
      ]
    },
    "point_up_limestone_quarry_cooldown": {
      "x": 4492,
      "y": 2743,
      "parent": "unlock_limestone",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "limestone": 19
        },
        {
          "limestone": 32
        },
        {
          "limestone": 47
        },
        {
          "limestone": 65
        },
        {
          "limestone": 86
        }
      ],
      "cost": {
        "limestone": 19
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "limestone_quarry",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "limestone_quarry",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_limestone_quarry_refine": {
      "x": 4692,
      "y": 2743,
      "parent": "point_up_limestone_quarry_count",
      "size": "small",
      "parents": [
        "point_up_limestone_quarry_count",
        "point_up_limestone_quarry_cooldown"
      ],
      "cost": {
        "limestone": 170
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "limestone_quarry",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_resin_grove_count": {
      "x": 4692,
      "y": 1943,
      "parent": "unlock_resin",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "resin": 22
        },
        {
          "resin": 40
        },
        {
          "resin": 62
        },
        {
          "resin": 87
        },
        {
          "resin": 116
        }
      ],
      "cost": {
        "resin": 22
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "resin_grove",
          "upgrade": "count"
        }
      ]
    },
    "point_up_resin_grove_cooldown": {
      "x": 4892,
      "y": 1943,
      "parent": "unlock_resin",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "resin": 26
        },
        {
          "resin": 44
        },
        {
          "resin": 65
        },
        {
          "resin": 90
        },
        {
          "resin": 119
        }
      ],
      "cost": {
        "resin": 26
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "resin_grove",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "resin_grove",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_resin_grove_refine": {
      "x": 4892,
      "y": 1743,
      "parent": "point_up_resin_grove_count",
      "size": "small",
      "parents": [
        "point_up_resin_grove_count",
        "point_up_resin_grove_cooldown"
      ],
      "cost": {
        "resin": 235
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "resin_grove",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_iron_mine_count": {
      "x": 4492,
      "y": 1543,
      "parent": "unlock_iron_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "iron_ore": 23
        },
        {
          "iron_ore": 42
        },
        {
          "iron_ore": 65
        },
        {
          "iron_ore": 92
        },
        {
          "iron_ore": 122
        }
      ],
      "cost": {
        "iron_ore": 23
      },
      "levelEffects": [
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "count"
            }
          ]
        },
        {
          "description": "提升单次采集进度上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "count"
            }
          ]
        }
      ],
      "description": "提升单次采集进度上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "iron_mine",
          "upgrade": "count"
        }
      ]
    },
    "point_up_iron_mine_cooldown": {
      "x": 4492,
      "y": 1343,
      "parent": "unlock_iron_mine",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "iron_ore": 27
        },
        {
          "iron_ore": 46
        },
        {
          "iron_ore": 69
        },
        {
          "iron_ore": 95
        },
        {
          "iron_ore": 126
        }
      ],
      "cost": {
        "iron_ore": 27
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "iron_mine",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "iron_mine",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_iron_mine_refine": {
      "x": 4692,
      "y": 1343,
      "parent": "point_up_iron_mine_count",
      "size": "small",
      "parents": [
        "point_up_iron_mine_count",
        "point_up_iron_mine_cooldown"
      ],
      "cost": {
        "iron_ore": 248
      },
      "description": "基础采集数量 +1（采集与恢复均满级后解锁，不重置已有等级）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "iron_mine",
          "upgrade": "refine"
        }
      ]
    },
    "point_up_farm_cooldown": {
      "x": 2210,
      "y": 1438,
      "parent": "unlock_farm",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "wood": 10,
          "stone": 8,
          "clay": 6
        },
        {
          "wood": 20,
          "stone": 16,
          "clay": 12
        },
        {
          "food": 22
        },
        {
          "food": 30
        },
        {
          "food": 40
        }
      ],
      "cost": {
        "wood": 10,
        "stone": 8,
        "clay": 6
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "farm",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_farm_efficiency": {
      "x": 1810,
      "y": 1438,
      "parent": "unlock_farm",
      "size": "small",
      "maxRepeat": 2,
      "cost": {},
      "levelEffects": [
        {
          "description": "提升该资源点徒手村民采集效率",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "efficiency"
            }
          ]
        },
        {
          "description": "提升该资源点徒手村民采集效率",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "farm",
              "upgrade": "efficiency"
            }
          ]
        }
      ],
      "description": "提升该资源点徒手村民采集效率",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "farm",
          "upgrade": "efficiency"
        }
      ]
    },
    "point_up_pasture_cooldown": {
      "x": 2210,
      "y": 1038,
      "parent": "unlock_pasture",
      "size": "small",
      "maxRepeat": 5,
      "repeatCosts": [
        {
          "food": 10
        },
        {
          "food": 17
        },
        {
          "food": 26
        },
        {
          "food": 35
        },
        {
          "food": 47
        }
      ],
      "cost": {
        "food": 10
      },
      "levelEffects": [
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "cooldown"
            }
          ]
        },
        {
          "description": "缩短资源恢复冷却时间",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "cooldown"
            }
          ]
        }
      ],
      "description": "缩短资源恢复冷却时间",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "pasture",
          "upgrade": "cooldown"
        }
      ]
    },
    "point_up_pasture_efficiency": {
      "x": 1810,
      "y": 1038,
      "parent": "unlock_pasture",
      "size": "small",
      "maxRepeat": 2,
      "cost": {},
      "levelEffects": [
        {
          "description": "提升该资源点徒手村民采集效率",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "efficiency"
            }
          ]
        },
        {
          "description": "提升该资源点徒手村民采集效率",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "pasture",
              "upgrade": "efficiency"
            }
          ]
        }
      ],
      "description": "提升该资源点徒手村民采集效率",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "pasture",
          "upgrade": "efficiency"
        }
      ]
    },
    "point_up_treasure_chest_dropRate": {
      "x": -825,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small",
      "maxRepeat": 8,
      "repeatCosts": [
        {
          "wood": 20,
          "stone": 10
        },
        {
          "wood": 30,
          "stone": 15,
          "plank": 5
        },
        {
          "wood": 45,
          "stone": 25,
          "plank": 10
        },
        {
          "wood": 60,
          "stone": 40,
          "plank": 15
        },
        {
          "wood": 80,
          "stone": 50,
          "plank": 25,
          "stone_slab": 3
        },
        {
          "wood": 100,
          "stone": 70,
          "plank": 35,
          "stone_slab": 8
        },
        {
          "wood": 130,
          "stone": 90,
          "plank": 50,
          "gear": 2
        },
        {
          "wood": 160,
          "stone": 120,
          "plank": 70,
          "gear": 5,
          "iron_ingot": 3
        }
      ],
      "cost": {
        "wood": 20,
        "stone": 10
      },
      "levelEffects": [
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        },
        {
          "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "dropRate"
            }
          ]
        }
      ],
      "description": "提高采集区资源点掉落宝箱的概率（觅食除外）",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "treasure_chest",
          "upgrade": "dropRate"
        }
      ]
    },
    "point_up_treasure_chest_rewardTypes": {
      "x": -968,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small",
      "maxRepeat": 3,
      "repeatCosts": [
        {
          "wood": 25,
          "plank": 10
        },
        {
          "wood": 40,
          "stone": 20,
          "plank": 15
        },
        {
          "wood": 60,
          "stone": 30,
          "plank": 25,
          "stone_slab": 5
        }
      ],
      "cost": {
        "wood": 25,
        "plank": 10
      },
      "levelEffects": [
        {
          "description": "提高宝箱奖励资源种类上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardTypes"
            }
          ]
        },
        {
          "description": "提高宝箱奖励资源种类上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardTypes"
            }
          ]
        },
        {
          "description": "提高宝箱奖励资源种类上限",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardTypes"
            }
          ]
        }
      ],
      "description": "提高宝箱奖励资源种类上限",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "treasure_chest",
          "upgrade": "rewardTypes"
        }
      ]
    },
    "point_up_treasure_chest_rewardAmount": {
      "x": -1111,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small",
      "maxRepeat": 3,
      "repeatCosts": [
        {
          "wood": 25,
          "stone": 15
        },
        {
          "wood": 40,
          "plank": 20,
          "stone": 10
        },
        {
          "wood": 60,
          "plank": 30,
          "stone_slab": 5
        }
      ],
      "cost": {
        "wood": 25,
        "stone": 15
      },
      "levelEffects": [
        {
          "description": "提高宝箱每种资源的奖励数量",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardAmount"
            }
          ]
        },
        {
          "description": "提高宝箱每种资源的奖励数量",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardAmount"
            }
          ]
        },
        {
          "description": "提高宝箱每种资源的奖励数量",
          "effects": [
            {
              "type": "pointUpgrade",
              "pointId": "treasure_chest",
              "upgrade": "rewardAmount"
            }
          ]
        }
      ],
      "description": "提高宝箱每种资源的奖励数量",
      "effects": [
        {
          "type": "pointUpgrade",
          "pointId": "treasure_chest",
          "upgrade": "rewardAmount"
        }
      ]
    }
  }
};
if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);
