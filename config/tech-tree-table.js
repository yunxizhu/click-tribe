/** 科技树数据表：布局 / 依赖 / 费用。由编辑器导出，运行时优先读取。 */
window.TECH_TREE_TABLE = {
  "version": 1,
  "canvas": {
    "width": 6400,
    "height": 6000
  },
  "techs": {
    "unlock_workbench": {
      "x": 2000,
      "y": 2000,
      "parent": null,
      "requires": null,
      "cost": {
        "wood": 5
      }
    },
    "unlock_forest": {
      "x": 2260,
      "y": 2000,
      "parent": "unlock_workbench",
      "requires": "unlock_workbench",
      "cost": {}
    },
    "unlock_house_capacity": {
      "x": 1220,
      "y": 2000,
      "parent": "unlock_auto_click",
      "requires": "unlock_auto_click",
      "cost": {
        "wood": 18,
        "plank": 8,
        "stone": 6
      }
    },
    "unlock_house_build_discount_v1": {
      "x": 960,
      "y": 2000,
      "parent": "unlock_house_capacity",
      "requires": "unlock_house_capacity",
      "cost": {
        "plank": 12,
        "stone": 10
      }
    },
    "unlock_house_build_discount_v2": {
      "x": 700,
      "y": 2000,
      "parent": "unlock_house_build_discount_v1",
      "requires": "unlock_house_build_discount_v1",
      "cost": {
        "brick": 15,
        "stone_slab": 8
      }
    },
    "unlock_house_build_discount_v3": {
      "x": 440,
      "y": 2000,
      "parent": "unlock_house_build_discount_v2",
      "requires": "unlock_house_build_discount_v2",
      "cost": {
        "brick": 25,
        "iron_ingot": 5,
        "lime": 8
      }
    },
    "unlock_house_work_speed_v1": {
      "x": 960,
      "y": 1820,
      "parent": "unlock_house_build_discount_v1",
      "requires": "unlock_house_build_discount_v1",
      "cost": {
        "wood": 20,
        "plank": 10
      }
    },
    "unlock_house_work_speed_v2": {
      "x": 700,
      "y": 1820,
      "parent": "unlock_house_work_speed_v1",
      "requires": "unlock_house_work_speed_v1",
      "cost": {
        "wood": 30,
        "plank": 15,
        "stone": 10
      }
    },
    "unlock_house_work_speed_v3": {
      "x": 440,
      "y": 1820,
      "parent": "unlock_house_work_speed_v2",
      "requires": "unlock_house_work_speed_v2",
      "cost": {
        "plank": 25,
        "stone_slab": 12
      }
    },
    "unlock_house_work_speed_v4": {
      "x": 200,
      "y": 1820,
      "parent": "unlock_house_work_speed_v3",
      "requires": "unlock_house_work_speed_v3",
      "cost": {
        "brick": 20,
        "pitch": 8
      }
    },
    "unlock_house_work_speed_v5": {
      "x": 80,
      "y": 1820,
      "parent": "unlock_house_work_speed_v4",
      "requires": "unlock_house_work_speed_v4",
      "cost": {
        "iron_ingot": 8,
        "gear": 3
      }
    },
    "unlock_tool_crafting": {
      "x": 2000,
      "y": 1740,
      "parent": "unlock_workbench",
      "requires": "unlock_workbench",
      "cost": {}
    },
    "unlock_farm": {
      "x": 1600,
      "y": 1620,
      "parent": "unlock_auto_click",
      "requires": "unlock_auto_click",
      "cost": {
        "wood": 20,
        "clay": 15,
        "brick": 8,
        "food": 10
      }
    },
    "unlock_food_gather_speed_v1": {
      "x": 1600,
      "y": 1400,
      "parent": "unlock_farm",
      "requires": "unlock_farm",
      "cost": {
        "food": 20,
        "wood": 12,
        "plank": 6
      }
    },
    "unlock_food_gather_speed_v2": {
      "x": 1600,
      "y": 1220,
      "parent": "unlock_food_gather_speed_v1",
      "requires": "unlock_food_gather_speed_v1",
      "cost": {
        "food": 35,
        "plank": 12,
        "brick": 8
      }
    },
    "unlock_food_gather_speed_v3": {
      "x": 1600,
      "y": 1040,
      "parent": "unlock_food_gather_speed_v2",
      "requires": "unlock_food_gather_speed_v2",
      "cost": {
        "food": 55,
        "brick": 12,
        "glass": 6
      }
    },
    "unlock_breed_saving_v1": {
      "x": 560,
      "y": 1360,
      "parent": "unlock_pasture",
      "requires": "unlock_pasture",
      "cost": {
        "food": 25,
        "wood": 10
      }
    },
    "unlock_breed_saving_v2": {
      "x": 360,
      "y": 1360,
      "parent": "unlock_breed_saving_v1",
      "requires": "unlock_breed_saving_v1",
      "cost": {
        "food": 40,
        "plank": 15
      }
    },
    "unlock_breed_saving_v3": {
      "x": 180,
      "y": 1360,
      "parent": "unlock_breed_saving_v2",
      "requires": "unlock_breed_saving_v2",
      "cost": {
        "food": 60,
        "brick": 12
      }
    },
    "unlock_breed_saving_v4": {
      "x": 40,
      "y": 1360,
      "parent": "unlock_breed_saving_v3",
      "requires": "unlock_breed_saving_v3",
      "cost": {
        "food": 90,
        "glass": 10,
        "copper_ingot": 5
      }
    },
    "unlock_breed_saving_v5": {
      "x": 40,
      "y": 1160,
      "parent": "unlock_breed_saving_v4",
      "requires": "unlock_breed_saving_v4",
      "cost": {
        "food": 120,
        "iron_ingot": 4,
        "glass": 12
      }
    },
    "unlock_pasture": {
      "x": 560,
      "y": 1620,
      "parent": "unlock_farm",
      "requires": "unlock_farm",
      "cost": {
        "brick": 18,
        "plank": 20,
        "glass": 8,
        "food": 30
      }
    },
    "unlock_auto_click": {
      "x": 1480,
      "y": 2000,
      "parent": "unlock_click_power",
      "requires": "unlock_click_power",
      "cost": {
        "wood": 5
      }
    },
    "unlock_click_power": {
      "x": 1740,
      "y": 2000,
      "parent": "unlock_workbench",
      "requires": "unlock_workbench",
      "cost": {
        "wood": 10
      }
    },
    "unlock_tool_durability_v1": {
      "x": 2000,
      "y": 1580,
      "parent": "unlock_tool_crafting",
      "requires": "unlock_tool_crafting",
      "cost": {
        "wood": 10,
        "stone": 10,
        "gravel": 10,
        "clay": 10,
        "resin": 10
      }
    },
    "unlock_tool_durability_v2": {
      "x": 2000,
      "y": 1420,
      "parent": "unlock_tool_durability_v1",
      "requires": "unlock_tool_durability_v1",
      "cost": {
        "plank": 12,
        "stone": 14,
        "clay": 12,
        "gravel": 10
      }
    },
    "unlock_tool_durability_v3": {
      "x": 2000,
      "y": 1260,
      "parent": "unlock_tool_durability_v2",
      "requires": "unlock_tool_durability_v2",
      "cost": {
        "plank": 10,
        "stone_slab": 8,
        "brick": 6,
        "resin": 8
      }
    },
    "unlock_tool_durability_v4": {
      "x": 2000,
      "y": 1100,
      "parent": "unlock_tool_durability_v3",
      "requires": "unlock_tool_durability_v3",
      "cost": {
        "stone_slab": 10,
        "glass": 8,
        "brick": 10,
        "pitch": 4
      }
    },
    "unlock_tool_durability_v5": {
      "x": 2000,
      "y": 940,
      "parent": "unlock_tool_durability_v4",
      "requires": [
        "unlock_tool_durability_v4",
        "unlock_pitch",
        "unlock_advanced_workbench"
      ],
      "cost": {
        "plank": 10,
        "stone_slab": 10,
        "glass": 10,
        "brick": 10,
        "rosin": 10,
        "copper_ingot": 5
      }
    },
    "unlock_tool_efficiency_v1": {
      "x": 1760,
      "y": 1580,
      "parent": "unlock_tool_durability_v1",
      "requires": "unlock_tool_durability_v1",
      "cost": {
        "plank": 14,
        "stone_slab": 10,
        "clay": 8
      }
    },
    "unlock_tool_efficiency_v2": {
      "x": 1760,
      "y": 1420,
      "parent": "unlock_tool_efficiency_v1",
      "requires": "unlock_tool_efficiency_v1",
      "cost": {
        "plank": 18,
        "brick": 8,
        "gravel": 12
      }
    },
    "unlock_tool_efficiency_v3": {
      "x": 1760,
      "y": 1260,
      "parent": "unlock_tool_efficiency_v2",
      "requires": "unlock_tool_efficiency_v2",
      "cost": {
        "stone_slab": 12,
        "brick": 10,
        "pitch": 4
      }
    },
    "unlock_tool_efficiency_v4": {
      "x": 1760,
      "y": 1100,
      "parent": "unlock_tool_efficiency_v3",
      "requires": "unlock_tool_efficiency_v3",
      "cost": {
        "brick": 14,
        "copper_ingot": 4,
        "glass": 8
      }
    },
    "unlock_tool_efficiency_v5": {
      "x": 1760,
      "y": 940,
      "parent": "unlock_tool_efficiency_v4",
      "requires": "unlock_tool_efficiency_v4",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "pitch": 6
      }
    },
    "unlock_quarry": {
      "x": 2620,
      "y": 2000,
      "parent": "unlock_forest",
      "requires": "unlock_forest",
      "cost": {
        "wood": 12,
        "plank": 5
      }
    },
    "unlock_clay_pit": {
      "x": 2620,
      "y": 2400,
      "parent": "unlock_forest",
      "requires": "unlock_forest",
      "cost": {
        "wood": 10,
        "plank": 3
      }
    },
    "unlock_gravel": {
      "x": 2980,
      "y": 2000,
      "parent": "unlock_quarry",
      "requires": "unlock_quarry",
      "cost": {
        "wood": 12,
        "plank": 4,
        "stone": 6
      }
    },
    "unlock_resin": {
      "x": 3180,
      "y": 1480,
      "parent": "unlock_forest",
      "requires": [
        "unlock_forest",
        "unlock_tool_efficiency_v1"
      ],
      "cost": {
        "wood": 14,
        "stone": 6
      }
    },
    "unlock_pitch": {
      "x": 2320,
      "y": 2560,
      "parent": "unlock_brick_craft",
      "requires": "unlock_brick_craft",
      "cost": {
        "resin": 12,
        "wood": 8
      }
    },
    "unlock_brick_craft": {
      "x": 2000,
      "y": 2320,
      "parent": "unlock_workbench",
      "requires": "unlock_workbench",
      "cost": {
        "clay": 8,
        "wood": 5
      }
    },
    "unlock_treasure_chest": {
      "x": 2480,
      "y": 1520,
      "parent": "unlock_workbench",
      "requires": "unlock_workbench",
      "cost": {}
    },
    "unlock_advanced_workbench": {
      "x": 2000,
      "y": 2560,
      "parent": "unlock_brick_craft",
      "requires": "unlock_brick_craft",
      "cost": {
        "brick": 12,
        "limestone": 10,
        "plank": 15,
        "stone_slab": 10,
        "gravel": 8
      }
    },
    "unlock_furnace": {
      "x": 2000,
      "y": 2800,
      "parent": "unlock_advanced_workbench",
      "requires": "unlock_advanced_workbench",
      "cost": {
        "stone_slab": 16,
        "plank": 10,
        "pitch": 4
      }
    },
    "unlock_copper_mine": {
      "x": 3700,
      "y": 2000,
      "parent": "unlock_limestone",
      "requires": [
        "unlock_limestone",
        "unlock_lime_craft"
      ],
      "cost": {
        "plank": 12,
        "stone_slab": 12,
        "limestone": 8
      }
    },
    "unlock_copper_smelt": {
      "x": 2320,
      "y": 2800,
      "parent": "unlock_furnace",
      "requires": "unlock_furnace",
      "cost": {
        "copper_ore": 5
      }
    },
    "unlock_coal_mine": {
      "x": 4060,
      "y": 2400,
      "parent": "unlock_copper_mine",
      "requires": [
        "unlock_copper_mine",
        "unlock_furnace"
      ],
      "cost": {
        "stone_slab": 14,
        "plank": 10,
        "coal": 5
      }
    },
    "unlock_tin_mine": {
      "x": 4060,
      "y": 2000,
      "parent": "unlock_copper_mine",
      "requires": "unlock_copper_mine",
      "cost": {
        "plank": 18,
        "stone": 14,
        "copper_ore": 8
      }
    },
    "unlock_zinc_mine": {
      "x": 3700,
      "y": 2400,
      "parent": "unlock_copper_mine",
      "requires": "unlock_copper_mine",
      "cost": {
        "plank": 16,
        "stone": 12,
        "copper_ore": 10
      }
    },
    "unlock_brass_craft": {
      "x": 2880,
      "y": 3160,
      "parent": "unlock_copper_smelt",
      "requires": "unlock_copper_smelt",
      "cost": {
        "copper_ingot": 5,
        "zinc_ore": 8
      }
    },
    "unlock_limestone": {
      "x": 3340,
      "y": 2000,
      "parent": "unlock_gravel",
      "requires": "unlock_gravel",
      "cost": {
        "stone": 16,
        "plank": 10,
        "gravel": 12
      }
    },
    "unlock_lime_craft": {
      "x": 2560,
      "y": 2800,
      "parent": "unlock_furnace",
      "requires": "unlock_furnace",
      "cost": {
        "limestone": 12,
        "coal": 5,
        "brick": 6
      }
    },
    "unlock_bronze_craft": {
      "x": 2560,
      "y": 3160,
      "parent": "unlock_copper_smelt",
      "requires": "unlock_copper_smelt",
      "cost": {
        "copper_ingot": 6,
        "tin_ore": 5
      }
    },
    "unlock_gear_craft": {
      "x": 1680,
      "y": 2800,
      "parent": "unlock_furnace",
      "requires": "unlock_furnace",
      "cost": {
        "copper_ingot": 8,
        "pitch": 6
      }
    },
    "unlock_defense_training": {
      "x": 2000,
      "y": 780,
      "parent": "unlock_tool_durability_v5",
      "requires": [
        "unlock_tool_durability_v5",
        "unlock_gear_craft"
      ],
      "cost": {
        "gear": 4,
        "plank": 20,
        "copper_ingot": 5
      }
    },
    "unlock_combat_hp_v1": {
      "x": 2000,
      "y": 620,
      "parent": "unlock_defense_training",
      "requires": "unlock_defense_training",
      "cost": {
        "food": 30,
        "plank": 15
      }
    },
    "unlock_combat_hp_v2": {
      "x": 2000,
      "y": 480,
      "parent": "unlock_combat_hp_v1",
      "requires": "unlock_combat_hp_v1",
      "cost": {
        "food": 45,
        "brick": 12,
        "stone_slab": 10
      }
    },
    "unlock_combat_hp_v3": {
      "x": 2000,
      "y": 340,
      "parent": "unlock_combat_hp_v2",
      "requires": "unlock_combat_hp_v2",
      "cost": {
        "food": 60,
        "iron_ingot": 6,
        "bronze": 8
      }
    },
    "unlock_combat_hp_v4": {
      "x": 2000,
      "y": 200,
      "parent": "unlock_combat_hp_v3",
      "requires": "unlock_combat_hp_v3",
      "cost": {
        "food": 80,
        "steel": 4,
        "lime": 12
      }
    },
    "unlock_combat_hp_v5": {
      "x": 2000,
      "y": 60,
      "parent": "unlock_combat_hp_v4",
      "requires": "unlock_combat_hp_v4",
      "cost": {
        "food": 100,
        "steel": 8,
        "silver_ingot": 4
      }
    },
    "unlock_combat_atk_v1": {
      "x": 1780,
      "y": 620,
      "parent": "unlock_defense_training",
      "requires": "unlock_defense_training",
      "cost": {
        "copper_ingot": 6,
        "stone_slab": 10
      }
    },
    "unlock_combat_atk_v2": {
      "x": 1560,
      "y": 480,
      "parent": "unlock_combat_atk_v1",
      "requires": "unlock_combat_atk_v1",
      "cost": {
        "iron_ingot": 5,
        "bronze": 8
      }
    },
    "unlock_combat_atk_v3": {
      "x": 1340,
      "y": 340,
      "parent": "unlock_combat_atk_v2",
      "requires": "unlock_combat_atk_v2",
      "cost": {
        "iron_ingot": 10,
        "gear": 4
      }
    },
    "unlock_combat_atk_v4": {
      "x": 1120,
      "y": 200,
      "parent": "unlock_combat_atk_v3",
      "requires": "unlock_combat_atk_v3",
      "cost": {
        "steel": 6,
        "pitch": 10
      }
    },
    "unlock_combat_atk_v5": {
      "x": 900,
      "y": 60,
      "parent": "unlock_combat_atk_v4",
      "requires": "unlock_combat_atk_v4",
      "cost": {
        "steel": 10,
        "gold_ingot": 3
      }
    },
    "unlock_combat_aspd_v1": {
      "x": 2220,
      "y": 620,
      "parent": "unlock_defense_training",
      "requires": "unlock_defense_training",
      "cost": {
        "resin": 10,
        "plank": 12
      }
    },
    "unlock_combat_aspd_v2": {
      "x": 2440,
      "y": 480,
      "parent": "unlock_combat_aspd_v1",
      "requires": "unlock_combat_aspd_v1",
      "cost": {
        "pitch": 8,
        "plank": 18
      }
    },
    "unlock_combat_aspd_v3": {
      "x": 2660,
      "y": 340,
      "parent": "unlock_combat_aspd_v2",
      "requires": "unlock_combat_aspd_v2",
      "cost": {
        "pitch": 12,
        "gear": 3
      }
    },
    "unlock_combat_aspd_v4": {
      "x": 2880,
      "y": 200,
      "parent": "unlock_combat_aspd_v3",
      "requires": "unlock_combat_aspd_v3",
      "cost": {
        "gear": 6,
        "iron_ingot": 4
      }
    },
    "unlock_combat_aspd_v5": {
      "x": 3100,
      "y": 60,
      "parent": "unlock_combat_aspd_v4",
      "requires": "unlock_combat_aspd_v4",
      "cost": {
        "gear": 10,
        "steel": 4
      }
    },
    "unlock_tough_skin": {
      "x": 2440,
      "y": 620,
      "parent": "unlock_defense_training",
      "requires": "unlock_defense_training",
      "cost": {
        "food": 40,
        "resin": 12,
        "copper_ingot": 6
      }
    },
    "unlock_gate_lv2": {
      "x": 1740,
      "y": 2260,
      "parent": "unlock_brick_craft",
      "requires": "unlock_brick_craft",
      "cost": {
        "plank": 15,
        "stone": 20
      }
    },
    "unlock_gate_lv3": {
      "x": 1480,
      "y": 2260,
      "parent": "unlock_gate_lv2",
      "requires": "unlock_gate_lv2",
      "cost": {
        "stone_slab": 20,
        "brick": 15,
        "pitch": 6
      }
    },
    "unlock_gate_lv4": {
      "x": 1220,
      "y": 2260,
      "parent": "unlock_gate_lv3",
      "requires": "unlock_gate_lv3",
      "cost": {
        "brick": 25,
        "iron_ingot": 12,
        "lime": 10
      }
    },
    "unlock_gate_repair_speed_v1": {
      "x": 1740,
      "y": 2520,
      "parent": "unlock_gate_lv2",
      "requires": "unlock_gate_lv2",
      "cost": {
        "brick": 12,
        "plank": 16,
        "stone": 10
      }
    },
    "unlock_gate_repair_speed_v2": {
      "x": 1480,
      "y": 2520,
      "parent": "unlock_gate_repair_speed_v1",
      "requires": "unlock_gate_repair_speed_v1",
      "cost": {
        "brick": 18,
        "iron_ingot": 4,
        "pitch": 6
      }
    },
    "unlock_gate_repair_speed_v3": {
      "x": 1220,
      "y": 2520,
      "parent": "unlock_gate_repair_speed_v2",
      "requires": "unlock_gate_repair_speed_v2",
      "cost": {
        "iron_ingot": 8,
        "lime": 8,
        "gear": 2
      }
    },
    "unlock_gate_repair_speed_v4": {
      "x": 960,
      "y": 2520,
      "parent": "unlock_gate_repair_speed_v3",
      "requires": "unlock_gate_repair_speed_v3",
      "cost": {
        "steel": 4,
        "brick": 20,
        "gear": 4
      }
    },
    "unlock_iron_mine": {
      "x": 4420,
      "y": 2400,
      "parent": "unlock_coal_mine",
      "requires": [
        "unlock_coal_mine",
        "unlock_gear_craft"
      ],
      "cost": {
        "copper_ingot": 10,
        "gear": 3,
        "plank": 20
      }
    },
    "unlock_iron_smelt": {
      "x": 1680,
      "y": 3160,
      "parent": "unlock_gear_craft",
      "requires": "unlock_gear_craft",
      "cost": {
        "iron_ore": 5,
        "coal": 3
      }
    },
    "unlock_silver_mine": {
      "x": 4420,
      "y": 2000,
      "parent": "unlock_tin_mine",
      "requires": [
        "unlock_tin_mine",
        "unlock_bronze_craft",
        "unlock_iron_smelt"
      ],
      "cost": {
        "iron_ingot": 8,
        "bronze": 6,
        "gear": 4
      }
    },
    "unlock_sulfur": {
      "x": 4780,
      "y": 2400,
      "parent": "unlock_iron_mine",
      "requires": "unlock_iron_mine",
      "cost": {
        "iron_ore": 12,
        "coal": 10,
        "brick": 15
      }
    },
    "unlock_obsidian": {
      "x": 5140,
      "y": 2400,
      "parent": "unlock_sulfur",
      "requires": "unlock_sulfur",
      "cost": {
        "iron_ingot": 6,
        "sulfur": 8,
        "lime": 8
      }
    },
    "unlock_silver_smelt": {
      "x": 1960,
      "y": 3380,
      "parent": "unlock_iron_smelt",
      "requires": "unlock_iron_smelt",
      "cost": {
        "silver_ore": 8,
        "coal": 5
      }
    },
    "unlock_gunpowder": {
      "x": 2320,
      "y": 3520,
      "parent": "unlock_furnace_upgrade",
      "requires": "unlock_furnace_upgrade",
      "cost": {
        "sulfur": 10,
        "coal": 8
      }
    },
    "unlock_furnace_upgrade": {
      "x": 2000,
      "y": 3160,
      "parent": "unlock_iron_smelt",
      "requires": "unlock_iron_smelt",
      "cost": {
        "iron_ingot": 10,
        "coke": 12,
        "brick": 15
      }
    },
    "unlock_steel_smelt": {
      "x": 2000,
      "y": 3520,
      "parent": "unlock_furnace_upgrade",
      "requires": "unlock_furnace_upgrade",
      "cost": {
        "iron_ingot": 8,
        "coke": 6,
        "brick": 8
      }
    },
    "unlock_gold_mine": {
      "x": 4780,
      "y": 2000,
      "parent": "unlock_silver_mine",
      "requires": [
        "unlock_silver_mine",
        "unlock_steel_smelt"
      ],
      "cost": {
        "steel": 12,
        "silver_ingot": 8,
        "gunpowder": 6
      }
    },
    "unlock_crystal": {
      "x": 4600,
      "y": 1480,
      "parent": "unlock_silver_mine",
      "requires": [
        "unlock_silver_mine",
        "unlock_steel_smelt"
      ],
      "cost": {
        "steel": 10,
        "glass": 12,
        "silver_ingot": 6
      }
    },
    "unlock_meteor": {
      "x": 5500,
      "y": 2400,
      "parent": "unlock_obsidian",
      "requires": [
        "unlock_obsidian",
        "unlock_steel_smelt"
      ],
      "cost": {
        "steel": 12,
        "gunpowder": 8,
        "obsidian": 10
      }
    },
    "unlock_star_metal": {
      "x": 2000,
      "y": 3880,
      "parent": "unlock_steel_smelt",
      "requires": "unlock_steel_smelt",
      "cost": {
        "meteorite": 8,
        "coal": 8
      }
    },
    "unlock_gold_smelt": {
      "x": 2280,
      "y": 3380,
      "parent": "unlock_silver_smelt",
      "requires": "unlock_silver_smelt",
      "cost": {
        "gold_ore": 8,
        "coal": 6
      }
    },
    "unlock_crystal_polish": {
      "x": 2600,
      "y": 3380,
      "parent": "unlock_silver_smelt",
      "requires": "unlock_silver_smelt",
      "cost": {
        "crystal": 6,
        "glass": 12
      }
    },
    "unlock_worker_efficiency_v1": {
      "x": 560,
      "y": 1100,
      "parent": "unlock_breed_saving_v1",
      "requires": "unlock_breed_saving_v1",
      "cost": {
        "wood": 16,
        "stone": 12,
        "plank": 6
      }
    },
    "unlock_worker_efficiency_v2": {
      "x": 360,
      "y": 1100,
      "parent": "unlock_worker_efficiency_v1",
      "requires": "unlock_worker_efficiency_v1",
      "cost": {
        "plank": 12,
        "stone": 16,
        "food": 20
      }
    },
    "unlock_worker_efficiency_v3": {
      "x": 180,
      "y": 1100,
      "parent": "unlock_worker_efficiency_v2",
      "requires": "unlock_worker_efficiency_v2",
      "cost": {
        "brick": 10,
        "plank": 15,
        "food": 30
      }
    },
    "unlock_worker_efficiency_v4": {
      "x": 40,
      "y": 980,
      "parent": "unlock_worker_efficiency_v3",
      "requires": "unlock_worker_efficiency_v3",
      "cost": {
        "glass": 8,
        "copper_ingot": 4,
        "food": 40
      }
    },
    "unlock_worker_efficiency_v5": {
      "x": 40,
      "y": 820,
      "parent": "unlock_worker_efficiency_v4",
      "requires": "unlock_worker_efficiency_v4",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "food": 50
      }
    },
    "unlock_point_recovery": {
      "x": 2640,
      "y": 3520,
      "parent": "unlock_furnace_upgrade",
      "requires": "unlock_furnace_upgrade",
      "cost": {
        "stone": 16,
        "gravel": 12,
        "plank": 10,
        "coal": 8
      }
    },
    "unlock_harvest_bounty": {
      "x": 40,
      "y": 660,
      "parent": "unlock_worker_efficiency_v5",
      "requires": "unlock_worker_efficiency_v5",
      "cost": {
        "steel": 10,
        "gold_ingot": 5,
        "polished_crystal": 4,
        "star_metal": 3
      }
    }
  }
};
if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);
