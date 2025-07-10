const router = require('express').Router();
let Kindergarten = require('../models/kindergarten.model');
let SchoolMonitor = require('../models/schoolMonitor.model');

router.route('/').get(async (req, res) => {
  try {
    const kindergartens = await Kindergarten.find();
    
    // Get application status data from school monitors
    const schoolMonitors = await SchoolMonitor.find({ isActive: true });
    const monitorMap = new Map();
    
    schoolMonitors.forEach(monitor => {
      monitorMap.set(monitor.schoolNo, monitor);
    });
    
    // Merge kindergarten data with application status
    const enrichedKindergartens = kindergartens.map(kg => {
      const monitor = monitorMap.get(kg.school_no);
      const enrichedKg = kg.toObject();
      
      if (monitor && monitor.applicationStatus) {
        enrichedKg.applicationStatus = {
          isOpen: monitor.applicationStatus.isOpen,
          startDate: monitor.applicationStatus.startDate,
          endDate: monitor.applicationStatus.endDate,
          deadline: monitor.applicationStatus.deadline,
          requirements: monitor.applicationStatus.requirements || [],
          notes: monitor.applicationStatus.notes,
          lastUpdated: monitor.applicationStatus.lastUpdated
        };
      }
      
      return enrichedKg;
    });
    
    res.json(enrichedKindergartens);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

router.route('/:schoolNo').get(async (req, res) => {
  try {
    const kindergarten = await Kindergarten.findOne({ school_no: req.params.schoolNo });
    
    if (!kindergarten) {
      return res.status(404).json('Kindergarten not found');
    }
    
    // Get application status data from school monitor
    const schoolMonitor = await SchoolMonitor.findOne({ schoolNo: req.params.schoolNo });
    const enrichedKg = kindergarten.toObject();
    
    if (schoolMonitor && schoolMonitor.applicationStatus) {
      enrichedKg.applicationStatus = {
        isOpen: schoolMonitor.applicationStatus.isOpen,
        startDate: schoolMonitor.applicationStatus.startDate,
        endDate: schoolMonitor.applicationStatus.endDate,
        deadline: schoolMonitor.applicationStatus.deadline,
        requirements: schoolMonitor.applicationStatus.requirements || [],
        notes: schoolMonitor.applicationStatus.notes,
        lastUpdated: schoolMonitor.applicationStatus.lastUpdated
      };
    }
    
    res.json(enrichedKg);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

module.exports = router; 