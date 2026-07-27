/** Tech tree table: layout / requires / cost. Runtime reads this first. */
window.TECH_TREE_TABLE = {
  "version": 19,
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
      }
    },
    "unlock_forest": {
      "x": 4292,
      "y": 2143,
      "parent": null,
      "size": "medium",
      "cost": {}
    },
    "unlock_plank_craft": {
      "x": 2230,
      "y": 2548,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {},
      "requires": "unlock_workbench"
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
      "requires": "unlock_tool_crafting"
    },
    "unlock_altar": {
      "x": -966,
      "y": 2032,
      "parent": null,
      "size": "medium",
      "cost": {}
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
      "requires": "unlock_altar"
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
      "requires": "unlock_altar"
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
      "requires": "unlock_altar"
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
      "requires": "unlock_altar"
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
      "requires": "unlock_sanctuary_gather"
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
      "requires": "unlock_sanctuary_gather_chance_v1"
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
      "requires": "unlock_sanctuary_gather_chance_v2"
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
      "requires": "unlock_sanctuary_gather_chance_v3"
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
      "requires": "unlock_sanctuary_gather_chance_v4"
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
      "requires": "unlock_sanctuary_gather"
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
      "requires": "unlock_sanctuary_gather_power_v1"
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
      "requires": "unlock_sanctuary_gather_power_v2"
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
      "requires": "unlock_sanctuary_gather_power_v3"
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
      "requires": "unlock_sanctuary_gather_power_v4"
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
      "requires": "unlock_sanctuary_craft"
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
      "requires": "unlock_sanctuary_craft_chance_v1"
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
      "requires": "unlock_sanctuary_craft_chance_v2"
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
      "requires": "unlock_sanctuary_craft_chance_v3"
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
      "requires": "unlock_sanctuary_craft_chance_v4"
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
      "requires": "unlock_sanctuary_craft"
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
      "requires": "unlock_sanctuary_craft_power_v1"
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
      "requires": "unlock_sanctuary_craft_power_v2"
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
      "requires": "unlock_sanctuary_craft_power_v3"
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
      "requires": "unlock_sanctuary_craft_power_v4"
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
      "requires": "unlock_sanctuary_war"
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
      "requires": "unlock_sanctuary_war_chance_v1"
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
      "requires": "unlock_sanctuary_war_chance_v2"
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
      "requires": "unlock_sanctuary_war_chance_v3"
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
      "requires": "unlock_sanctuary_war_chance_v4"
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
      "requires": "unlock_sanctuary_war"
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
      "requires": "unlock_sanctuary_war_power_v1"
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
      "requires": "unlock_sanctuary_war_power_v2"
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
      "requires": "unlock_sanctuary_war_power_v3"
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
      "requires": "unlock_sanctuary_war_power_v4"
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
      "requires": "unlock_sanctuary_efficiency"
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
      "requires": "unlock_sanctuary_eff_chance_v1"
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
      "requires": "unlock_sanctuary_eff_chance_v2"
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
      "requires": "unlock_sanctuary_eff_chance_v3"
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
      "requires": "unlock_sanctuary_eff_chance_v4"
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
      "requires": "unlock_sanctuary_efficiency"
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
      "requires": "unlock_sanctuary_eff_power_v1"
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
      "requires": "unlock_sanctuary_eff_power_v2"
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
      "requires": "unlock_sanctuary_eff_power_v3"
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
      "requires": "unlock_sanctuary_eff_power_v4"
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
      "requires": "unlock_sanctuary_efficiency"
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
      "requires": "unlock_sanctuary_eff_duration_v1"
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
      "requires": "unlock_sanctuary_eff_duration_v2"
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
      "requires": "unlock_sanctuary_eff_duration_v3"
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
      "requires": "unlock_sanctuary_eff_duration_v4"
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
      "requires": "unlock_workbench"
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
      "requires": "unlock_house_upgrade_1"
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
      "requires": "unlock_house_upgrade_2"
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
      "requires": "unlock_house_upgrade_3"
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
      "requires": "unlock_house_upgrade_4"
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
      "requires": "unlock_house_upgrade_1"
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
      "requires": "unlock_house_upgrade_2"
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
      "requires": "unlock_house_upgrade_3"
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
      "requires": "unlock_house_upgrade_1"
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
      "requires": "unlock_house_upgrade_2"
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
      "requires": "unlock_house_upgrade_3"
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
      "requires": "unlock_house_upgrade_4"
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
      "requires": "unlock_house_capacity"
    },
    "unlock_tool_crafting": {
      "x": 2400,
      "y": 2000,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {},
      "requires": "unlock_workbench"
    },
    "unlock_tools_lv1": {
      "x": 2601,
      "y": 1703,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {},
      "requires": "unlock_tool_crafting"
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
      "requires": "unlock_tools_lv1"
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
      "requires": "unlock_tools_lv2"
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
      "requires": "unlock_tools_lv3"
    },
    "unlock_weapons_lv1": {
      "x": 2601,
      "y": 2288,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {},
      "requires": "unlock_tool_crafting"
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
      "requires": "unlock_weapons_lv1"
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
      "requires": "unlock_weapons_lv2"
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
      "requires": "unlock_weapons_lv3"
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
      "requires": "unlock_food_gather_speed_v1"
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
      "requires": "unlock_click_power"
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
      "requires": "unlock_farm"
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
      "requires": "unlock_pasture"
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
      "requires": "unlock_house_upgrade_1"
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
      "requires": "unlock_house_upgrade_2"
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
      "requires": "unlock_house_upgrade_3"
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
      "requires": "unlock_house_upgrade_4"
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
      "requires": "unlock_house_capacity"
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
      "requires": "unlock_food_gather_speed_v2"
    },
    "unlock_auto_click": {
      "x": 2222,
      "y": 1813,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "wood": 5
      },
      "requires": "unlock_click_power"
    },
    "unlock_click_power": {
      "x": 2003,
      "y": 1804,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 10
      },
      "requires": "unlock_workbench"
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
      "requires": "unlock_tool_durability_v4"
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
      "requires": "unlock_tools_lv1"
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
      "requires": "unlock_tools_lv2"
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
      "requires": "unlock_tools_lv3"
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
      "requires": "unlock_tools_lv4"
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
      "requires": "unlock_tool_efficiency_v4"
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
      "requires": "unlock_weapons_lv1"
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
      "requires": "unlock_weapons_lv2"
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
      "requires": "unlock_weapons_lv3"
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
      "requires": "unlock_weapons_lv4"
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
      "requires": "unlock_efficient_repair_v4"
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
      "requires": "unlock_forest"
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
      "requires": "unlock_forest"
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
      "requires": "unlock_forest"
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
      "requires": "unlock_gravel"
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
      "requires": "unlock_brick_craft"
    },
    "unlock_brick_craft": {
      "x": 3027,
      "y": 3391,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {},
      "requires": "unlock_furnace"
    },
    "unlock_stone_slab": {
      "x": 2483,
      "y": 2640,
      "parent": "unlock_plank_craft",
      "size": "medium",
      "cost": {
        "stone": 10
      },
      "requires": "unlock_plank_craft"
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
      }
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
      }
    },
    "unlock_treasure_chest": {
      "x": -971,
      "y": 1824,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {},
      "requires": "unlock_altar"
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
      "requires": "unlock_brick_craft"
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
      "requires": "unlock_workbench"
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
      "requires": "unlock_craft_efficiency_v1"
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
      "requires": "unlock_craft_efficiency_v2"
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
      "requires": "unlock_craft_efficiency_v3"
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
      "requires": "unlock_craft_efficiency_v4"
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
      "requires": "unlock_stone_slab"
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
      "requires": "unlock_quarry"
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
      "requires": "unlock_limestone"
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
      "requires": "unlock_copper_mine"
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
      "requires": "unlock_clay_pit"
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
      "requires": "unlock_furnace"
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
      "requires": "unlock_furnace"
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
      }
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
      "requires": "unlock_defense_training"
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
      "requires": "unlock_combat_hp_v1"
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
      "requires": "unlock_combat_hp_v2"
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
      "requires": "unlock_combat_hp_v3"
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
      "requires": "unlock_combat_hp_v4"
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
      "requires": "unlock_defense_training"
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
      "requires": "unlock_combat_atk_v1"
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
      "requires": "unlock_combat_atk_v2"
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
      "requires": "unlock_combat_atk_v3"
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
      "requires": "unlock_combat_atk_v4"
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
      "requires": "unlock_defense_training"
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
      "requires": "unlock_combat_aspd_v1"
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
      "requires": "unlock_combat_aspd_v2"
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
      "requires": "unlock_combat_aspd_v3"
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
      "requires": "unlock_combat_aspd_v4"
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
      "requires": "unlock_defense_training"
    },
    "unlock_gate_lv2": {
      "x": 2566,
      "y": 3274,
      "parent": null,
      "size": "medium",
      "cost": {
        "plank": 15,
        "stone": 20
      }
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
      "requires": "unlock_gate_lv2"
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
      "requires": "unlock_gate_lv3"
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
      "requires": "unlock_gate_lv2"
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
      "requires": "unlock_gate_repair_speed_v1"
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
      "requires": "unlock_gate_repair_speed_v2"
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
      "requires": "unlock_gate_repair_speed_v3"
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
      }
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
      "requires": "unlock_house_upgrade_1"
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
      "requires": "unlock_house_upgrade_2"
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
      "requires": "unlock_house_upgrade_3"
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
      "requires": "unlock_house_upgrade_4"
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
      "requires": "unlock_house_capacity"
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
      "requires": "unlock_furnace_upgrade"
    },
    "point_up_forest_count": {
      "x": 4092,
      "y": 1943,
      "parent": "unlock_forest",
      "size": "small"
    },
    "point_up_forest_cooldown": {
      "x": 4092,
      "y": 2143,
      "parent": "unlock_forest",
      "size": "small"
    },
    "point_up_forest_refine": {
      "x": 3892,
      "y": 1943,
      "parent": "point_up_forest_count",
      "size": "small",
      "parents": [
        "point_up_forest_count",
        "point_up_forest_cooldown"
      ]
    },
    "point_up_quarry_count": {
      "x": 4492,
      "y": 1743,
      "parent": "unlock_quarry",
      "size": "small"
    },
    "point_up_quarry_cooldown": {
      "x": 4492,
      "y": 1943,
      "parent": "unlock_quarry",
      "size": "small"
    },
    "point_up_quarry_refine": {
      "x": 4692,
      "y": 1743,
      "parent": "point_up_quarry_count",
      "size": "small",
      "parents": [
        "point_up_quarry_count",
        "point_up_quarry_cooldown"
      ]
    },
    "point_up_clay_pit_count": {
      "x": 4091,
      "y": 2543,
      "parent": "unlock_clay_pit",
      "size": "small"
    },
    "point_up_clay_pit_cooldown": {
      "x": 4092,
      "y": 2343,
      "parent": "unlock_clay_pit",
      "size": "small"
    },
    "point_up_clay_pit_refine": {
      "x": 3892,
      "y": 2543,
      "parent": "point_up_clay_pit_count",
      "size": "small",
      "parents": [
        "point_up_clay_pit_count",
        "point_up_clay_pit_cooldown"
      ]
    },
    "point_up_copper_mine_count": {
      "x": 4092,
      "y": 1743,
      "parent": "unlock_copper_mine",
      "size": "small"
    },
    "point_up_copper_mine_cooldown": {
      "x": 4092,
      "y": 1543,
      "parent": "unlock_copper_mine",
      "size": "small"
    },
    "point_up_copper_mine_refine": {
      "x": 3892,
      "y": 1543,
      "parent": "point_up_copper_mine_count",
      "size": "small",
      "parents": [
        "point_up_copper_mine_count",
        "point_up_copper_mine_cooldown"
      ]
    },
    "point_up_coal_mine_count": {
      "x": 4092,
      "y": 2743,
      "parent": "unlock_coal_mine",
      "size": "small"
    },
    "point_up_coal_mine_cooldown": {
      "x": 4092,
      "y": 2943,
      "parent": "unlock_coal_mine",
      "size": "small"
    },
    "point_up_coal_mine_refine": {
      "x": 3892,
      "y": 2943,
      "parent": "point_up_coal_mine_count",
      "size": "small",
      "parents": [
        "point_up_coal_mine_count",
        "point_up_coal_mine_cooldown"
      ]
    },
    "point_up_gravel_bed_count": {
      "x": 4692,
      "y": 2343,
      "parent": "unlock_gravel",
      "size": "small"
    },
    "point_up_gravel_bed_cooldown": {
      "x": 4492,
      "y": 2343,
      "parent": "unlock_gravel",
      "size": "small"
    },
    "point_up_gravel_bed_refine": {
      "x": 4692,
      "y": 2543,
      "parent": "point_up_gravel_bed_count",
      "size": "small",
      "parents": [
        "point_up_gravel_bed_count",
        "point_up_gravel_bed_cooldown"
      ]
    },
    "point_up_limestone_quarry_count": {
      "x": 4492,
      "y": 2543,
      "parent": "unlock_limestone",
      "size": "small"
    },
    "point_up_limestone_quarry_cooldown": {
      "x": 4492,
      "y": 2743,
      "parent": "unlock_limestone",
      "size": "small"
    },
    "point_up_limestone_quarry_refine": {
      "x": 4692,
      "y": 2743,
      "parent": "point_up_limestone_quarry_count",
      "size": "small",
      "parents": [
        "point_up_limestone_quarry_count",
        "point_up_limestone_quarry_cooldown"
      ]
    },
    "point_up_resin_grove_count": {
      "x": 4692,
      "y": 1943,
      "parent": "unlock_resin",
      "size": "small"
    },
    "point_up_resin_grove_cooldown": {
      "x": 4892,
      "y": 1943,
      "parent": "unlock_resin",
      "size": "small"
    },
    "point_up_resin_grove_refine": {
      "x": 4892,
      "y": 1743,
      "parent": "point_up_resin_grove_count",
      "size": "small",
      "parents": [
        "point_up_resin_grove_count",
        "point_up_resin_grove_cooldown"
      ]
    },
    "point_up_iron_mine_count": {
      "x": 4492,
      "y": 1543,
      "parent": "unlock_iron_mine",
      "size": "small"
    },
    "point_up_iron_mine_cooldown": {
      "x": 4492,
      "y": 1343,
      "parent": "unlock_iron_mine",
      "size": "small"
    },
    "point_up_iron_mine_refine": {
      "x": 4692,
      "y": 1343,
      "parent": "point_up_iron_mine_count",
      "size": "small",
      "parents": [
        "point_up_iron_mine_count",
        "point_up_iron_mine_cooldown"
      ]
    },
    "point_up_farm_cooldown": {
      "x": 2210,
      "y": 1438,
      "parent": "unlock_farm",
      "size": "small"
    },
    "point_up_farm_efficiency": {
      "x": 1810,
      "y": 1438,
      "parent": "unlock_farm",
      "size": "small"
    },
    "point_up_pasture_cooldown": {
      "x": 2210,
      "y": 1038,
      "parent": "unlock_pasture",
      "size": "small"
    },
    "point_up_pasture_efficiency": {
      "x": 1810,
      "y": 1038,
      "parent": "unlock_pasture",
      "size": "small"
    },
    "point_up_treasure_chest_dropRate": {
      "x": -825,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small"
    },
    "point_up_treasure_chest_rewardTypes": {
      "x": -968,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small"
    },
    "point_up_treasure_chest_rewardAmount": {
      "x": -1111,
      "y": 1625,
      "parent": "unlock_treasure_chest",
      "size": "small"
    }
  }
};
if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);
