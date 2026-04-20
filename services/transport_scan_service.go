package services

import (
	"errors"
	"logistics-system/database"
	"logistics-system/dto"
)

func (s *TransportService) resolveTransportTaskForScan(taskNo string, scanCode string, allowedStatuses ...string) (uint, string, string, error) {
	code := normalizeBusinessCode(taskNo)
	codeType := "task_no"
	parcelNo := ""
	if code == "" {
		code = normalizeBusinessCode(scanCode)
		codeType = ""
	}
	if code == "" {
		return 0, "", "", errors.New("请提供任务号或扫描码")
	}

	task, err := resolveTransportTaskByCode(database.DB, code, allowedStatuses...)
	if err != nil {
		return 0, "", "", err
	}

	if codeType == "" {
		if _, pkg, resolvedType, resolveErr := resolveOrderByScanCode(database.DB, scanCode); resolveErr == nil {
			codeType = resolvedType
			if pkg != nil {
				parcelNo = pkg.ParcelNo
			}
		} else if task.TaskNo == normalizeBusinessCode(scanCode) {
			codeType = "transport_task_no"
		}
	}

	return task.ID, task.TaskNo, parcelNo, nil
}

func (s *TransportService) LoadScanByCode(operatorID uint, operatorRole int, req *dto.TransportScanRequest) (*dto.TransportScanResponse, error) {
	taskID, taskNo, parcelNo, err := s.resolveTransportTaskForScan(req.TaskNo, req.ScanCode, "pending")
	if err != nil {
		return nil, err
	}
	resp, err := s.LoadScan(taskID, operatorID, operatorRole, req)
	if err != nil {
		return nil, err
	}
	resp.TaskNo = taskNo
	if _, pkg, codeType, resolveErr := resolveOrderByScanCode(database.DB, req.ScanCode); resolveErr == nil {
		resp.ScanCodeType = codeType
		if pkg != nil {
			resp.ParcelNo = pkg.ParcelNo
		}
	} else if resp.ScanCodeType == "" {
		if taskNo == normalizeBusinessCode(req.ScanCode) {
			resp.ScanCodeType = "transport_task_no"
		} else if parcelNo != "" {
			resp.ScanCodeType = "parcel_no"
		} else {
			resp.ScanCodeType = "order_no"
		}
	}
	if resp.ParcelNo == "" {
		resp.ParcelNo = parcelNo
	}
	return resp, nil
}

func (s *TransportService) UnloadScanByCode(operatorID uint, operatorRole int, req *dto.TransportScanRequest) (*dto.TransportScanResponse, error) {
	taskID, taskNo, parcelNo, err := s.resolveTransportTaskForScan(req.TaskNo, req.ScanCode, "in_progress")
	if err != nil {
		return nil, err
	}
	resp, err := s.UnloadScan(taskID, operatorID, operatorRole, req)
	if err != nil {
		return nil, err
	}
	resp.TaskNo = taskNo
	if _, pkg, codeType, resolveErr := resolveOrderByScanCode(database.DB, req.ScanCode); resolveErr == nil {
		resp.ScanCodeType = codeType
		if pkg != nil {
			resp.ParcelNo = pkg.ParcelNo
		}
	} else if resp.ScanCodeType == "" {
		if taskNo == normalizeBusinessCode(req.ScanCode) {
			resp.ScanCodeType = "transport_task_no"
		} else if parcelNo != "" {
			resp.ScanCodeType = "parcel_no"
		} else {
			resp.ScanCodeType = "order_no"
		}
	}
	if resp.ParcelNo == "" {
		resp.ParcelNo = parcelNo
	}
	return resp, nil
}
