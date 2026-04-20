package services

import (
	"errors"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"

	"gorm.io/gorm"
)

func (s *StationService) GetStationServiceAreas(stationID uint) ([]models.StationServiceArea, error) {
	if _, err := s.GetStationByID(stationID); err != nil {
		return nil, err
	}

	var areas []models.StationServiceArea
	if err := database.DB.Where("station_id = ?", stationID).Order("priority DESC, id ASC").Find(&areas).Error; err != nil {
		return nil, errors.New("query station service areas failed")
	}
	return areas, nil
}

func (s *StationService) CreateStationServiceArea(stationID uint, req *dto.CreateStationServiceAreaRequest) (*models.StationServiceArea, error) {
	if _, err := s.GetStationByID(stationID); err != nil {
		return nil, err
	}

	area := &models.StationServiceArea{
		StationID: stationID,
		Country:   strings.TrimSpace(req.Country),
		Province:  strings.TrimSpace(req.Province),
		City:      strings.TrimSpace(req.City),
		District:  strings.TrimSpace(req.District),
		Priority:  req.Priority,
		Status:    1,
		Remark:    strings.TrimSpace(req.Remark),
	}
	if area.Priority <= 0 {
		area.Priority = 100
	}
	if req.Status != nil {
		area.Status = *req.Status
	}
	if err := validateStationServiceArea(area); err != nil {
		return nil, err
	}
	if err := ensureUniqueStationServiceArea(0, area); err != nil {
		return nil, err
	}

	if err := database.DB.Create(area).Error; err != nil {
		return nil, errors.New("create station service area failed")
	}
	return area, nil
}

func (s *StationService) UpdateStationServiceArea(stationID uint, areaID uint, req *dto.UpdateStationServiceAreaRequest) error {
	if _, err := s.GetStationByID(stationID); err != nil {
		return err
	}

	var area models.StationServiceArea
	if err := database.DB.Where("id = ? AND station_id = ?", areaID, stationID).First(&area).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("station service area not found")
		}
		return errors.New("query station service area failed")
	}

	if req.Country != "" {
		area.Country = strings.TrimSpace(req.Country)
	}
	if req.Province != "" || area.Province != "" {
		area.Province = strings.TrimSpace(req.Province)
	}
	if req.City != "" || area.City != "" {
		area.City = strings.TrimSpace(req.City)
	}
	if req.District != "" || area.District != "" {
		area.District = strings.TrimSpace(req.District)
	}
	if req.Priority > 0 {
		area.Priority = req.Priority
	}
	if req.Status != nil {
		area.Status = *req.Status
	}
	if req.Remark != "" || area.Remark != "" {
		area.Remark = strings.TrimSpace(req.Remark)
	}

	if err := validateStationServiceArea(&area); err != nil {
		return err
	}
	if err := ensureUniqueStationServiceArea(area.ID, &area); err != nil {
		return err
	}

	if err := database.DB.Model(&models.StationServiceArea{}).Where("id = ?", area.ID).Updates(map[string]interface{}{
		"country":  area.Country,
		"province": area.Province,
		"city":     area.City,
		"district": area.District,
		"priority": area.Priority,
		"status":   area.Status,
		"remark":   area.Remark,
	}).Error; err != nil {
		return errors.New("update station service area failed")
	}

	return nil
}

func (s *StationService) DeleteStationServiceArea(stationID uint, areaID uint) error {
	if _, err := s.GetStationByID(stationID); err != nil {
		return err
	}
	if err := database.DB.Where("id = ? AND station_id = ?", areaID, stationID).Delete(&models.StationServiceArea{}).Error; err != nil {
		return errors.New("delete station service area failed")
	}
	return nil
}

func validateStationServiceArea(area *models.StationServiceArea) error {
	if strings.TrimSpace(area.Country) == "" {
		return errors.New("service area country is required")
	}
	if strings.TrimSpace(area.Province) == "" && strings.TrimSpace(area.City) != "" {
		return errors.New("service area city requires province")
	}
	if strings.TrimSpace(area.City) == "" && strings.TrimSpace(area.District) != "" {
		return errors.New("service area district requires city")
	}
	return nil
}

func ensureUniqueStationServiceArea(areaID uint, area *models.StationServiceArea) error {
	query := database.DB.Where(
		"station_id = ? AND country = ? AND province = ? AND city = ? AND district = ?",
		area.StationID,
		area.Country,
		area.Province,
		area.City,
		area.District,
	)
	if areaID > 0 {
		query = query.Where("id <> ?", areaID)
	}

	var existing models.StationServiceArea
	if err := query.First(&existing).Error; err == nil {
		return errors.New("duplicate station service area")
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return errors.New("query station service area failed")
	}
	return nil
}

func resolveStationServiceAreaScopeLevel(area models.StationServiceArea) string {
	switch {
	case strings.TrimSpace(area.District) != "":
		return "district"
	case strings.TrimSpace(area.City) != "":
		return "city"
	case strings.TrimSpace(area.Province) != "":
		return "province"
	default:
		return "country"
	}
}
