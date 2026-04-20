package services

import (
	"errors"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

const systemAutomationOperatorRole = int(models.RoleAdmin)

func (s *OrderService) autoAcceptAndCreatePickupTaskTx(tx *gorm.DB, order *models.Order, req *dto.CreateOrderRequest) error {
	station, err := s.resolveAutoPickupStationTx(tx, req)
	if err != nil {
		return err
	}
	if station == nil {
		return nil
	}

	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("origin_station_id", station.ID).Error; err != nil {
		return errors.New("update origin station failed")
	}
	order.OriginStationID = station.ID

	if order.Status == models.OrderPending {
		if err := s.autoAcceptOrderTx(tx, order, station.Name); err != nil {
			return err
		}
	}

	pickupService := &PickupService{}
	if _, _, err := pickupService.ensurePickupTaskTx(tx, order, station.ID, 0, systemAutomationOperatorRole, "order auto-created pickup task"); err != nil {
		return err
	}
	return nil
}

func (s *OrderService) autoAcceptOrderTx(tx *gorm.DB, order *models.Order, location string) error {
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"status": int(models.OrderAccepted),
		"remark": "order auto-accepted",
	}).Error; err != nil {
		return errors.New("auto accept order failed")
	}

	log := models.OrderStatusLog{
		OrderID:      order.ID,
		FromStatus:   models.OrderPending,
		ToStatus:     models.OrderAccepted,
		OperatorID:   0,
		OperatorName: "System",
		OperatorRole: systemAutomationOperatorRole,
		Remark:       "order auto-accepted",
		ChangeTime:   time.Now().Unix(),
	}
	if err := tx.Create(&log).Error; err != nil {
		return errors.New("create auto-accept status log failed")
	}

	if err := s.createOrderTrackingRecordTx(tx, order.ID, location, "accepted", "order auto-accepted", 0); err != nil {
		return err
	}

	order.Status = models.OrderAccepted
	order.Remark = "order auto-accepted"
	return nil
}

func (s *OrderService) resolveAutoPickupStationTx(tx *gorm.DB, req *dto.CreateOrderRequest) (*models.Station, error) {
	country := strings.TrimSpace(req.SenderCountry)
	province := strings.TrimSpace(req.SenderProvince)
	city := strings.TrimSpace(req.SenderCity)
	if country == "" {
		return nil, nil
	}

	station, err := s.resolveAutoPickupStationByServiceAreaTx(tx, country, province, city)
	if err != nil {
		return nil, err
	}
	if station != nil {
		return station, nil
	}

	findFirst := func(query *gorm.DB) (*models.Station, error) {
		var station models.Station
		err := query.Order("id ASC").First(&station).Error
		if err == nil {
			return &station, nil
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, errors.New("query auto pickup station failed")
	}

	baseQuery := tx.Model(&models.Station{}).Where("status = ? AND type = ? AND country = ?", 1, models.StationOrigin, country)

	if province != "" && city != "" {
		station, err := findFirst(baseQuery.Where("province = ? AND city = ?", province, city))
		if err != nil {
			return nil, err
		}
		if station != nil {
			return station, nil
		}
	}

	if province != "" {
		station, err := findFirst(baseQuery.Where("province = ?", province))
		if err != nil {
			return nil, err
		}
		if station != nil {
			return station, nil
		}
	}

	if province == "" && city != "" {
		station, err := findFirst(baseQuery.Where("city = ?", city))
		if err != nil {
			return nil, err
		}
		if station != nil {
			return station, nil
		}
	}

	if province == "" && city == "" {
		var stations []models.Station
		if err := baseQuery.Order("id ASC").Find(&stations).Error; err != nil {
			return nil, errors.New("query auto pickup station failed")
		}
		if len(stations) == 1 {
			return &stations[0], nil
		}
	}

	return nil, nil
}

func (s *OrderService) resolveAutoPickupStationByServiceAreaTx(tx *gorm.DB, country, province, city string) (*models.Station, error) {
	type serviceAreaCandidate struct {
		models.StationServiceArea
		Station models.Station
	}

	var areas []models.StationServiceArea
	if err := tx.Where("status = ? AND country = ?", 1, country).Order("priority DESC, id ASC").Find(&areas).Error; err != nil {
		return nil, errors.New("query station service areas failed")
	}
	if len(areas) == 0 {
		return nil, nil
	}

	stationIDs := make([]uint, 0, len(areas))
	for _, area := range areas {
		stationIDs = append(stationIDs, area.StationID)
	}

	var stations []models.Station
	if err := tx.Where("id IN ? AND status = ? AND type = ?", stationIDs, 1, models.StationOrigin).Find(&stations).Error; err != nil {
		return nil, errors.New("query service area stations failed")
	}
	stationMap := make(map[uint]models.Station, len(stations))
	for _, station := range stations {
		stationMap[station.ID] = station
	}

	var best *serviceAreaCandidate
	bestScore := -1
	for _, area := range areas {
		station, ok := stationMap[area.StationID]
		if !ok {
			continue
		}
		score, matched := matchStationServiceArea(area, province, city)
		if !matched {
			continue
		}
		score += area.Priority
		if best == nil || score > bestScore || (score == bestScore && station.ID < best.Station.ID) {
			candidate := serviceAreaCandidate{StationServiceArea: area, Station: station}
			best = &candidate
			bestScore = score
		}
	}

	if best == nil {
		return nil, nil
	}
	return &best.Station, nil
}

func matchStationServiceArea(area models.StationServiceArea, province, city string) (int, bool) {
	areaProvince := strings.TrimSpace(area.Province)
	areaCity := strings.TrimSpace(area.City)
	areaDistrict := strings.TrimSpace(area.District)

	if areaProvince != "" && areaProvince != province {
		return 0, false
	}
	if areaCity != "" && areaCity != city {
		return 0, false
	}
	if areaDistrict != "" {
		return 0, false
	}

	score := 100
	if areaProvince != "" {
		score += 100
	}
	if areaCity != "" {
		score += 100
	}
	return score, true
}

func (s *OrderService) createOrderTrackingRecordTx(tx *gorm.DB, orderID uint, location, status, description string, operatorID uint) error {
	now := time.Now().Unix()
	record := models.TrackingRecord{
		OrderID:     orderID,
		Location:    strings.TrimSpace(location),
		Status:      strings.TrimSpace(status),
		Description: strings.TrimSpace(description),
		OperatorID:  operatorID,
		CTime:       now,
		MTime:       now,
	}
	if record.Location == "" {
		record.Location = "System"
	}
	if err := tx.Create(&record).Error; err != nil {
		return errors.New("create order tracking record failed")
	}
	return nil
}
